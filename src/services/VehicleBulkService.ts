import { randomUUID } from "crypto";
import { Op, Transaction, UniqueConstraintError } from "sequelize";
import db, { VehicleModel, VehicleTypeModel } from "../database/models";
import { fetchCompaniesStrict, RegistryUnavailableError } from "./integrations/integrationService";
import { logError } from "../utils/logError";
import {
  ItemFailure,
  MAX_BULK_ITEMS,
  normalizeText,
  plateKey,
  plateVariants,
  validateVehicleItems,
  ValidVehicleItem,
} from "../utils/VehicleImport";
import { compareVehicle, CurrentVehicle, FieldChange, isConflict } from "../utils/VehicleUpsert";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Veículo que entraria (ou entrou) na importação. */
interface CreatedItem {
  line: number;
  vehicleNumber: string;
  vehicleId: string;
}

/** Item ignorado: veículo já cadastrado (`insert`) ou alteração não confirmada (`upsert`). */
interface SkippedItem {
  line: number;
  vehicleNumber: string;
  vehicleId: string;
  reason: string;
  /** Só em `upsert`: o que mudaria se o id viesse em `confirmIds`. */
  changes?: FieldChange[];
}

/** Veículo existente que a importação atualiza (ou atualizaria, em `dryRun`). */
interface UpdatedItem {
  line: number;
  vehicleNumber: string;
  vehicleId: string;
  changes: FieldChange[];
}

/** Veículo existente igual à planilha: nada é gravado. */
interface UnchangedItem {
  line: number;
  vehicleNumber: string;
  vehicleId: string;
}

/** Atualização confirmada, pronta para gravar. */
interface PlannedUpdate extends UpdatedItem {
  patch: Record<string, string | number | boolean>;
}

/** Opções da importação (query string e corpo). */
export interface ImportOptions {
  /** Só valida e relata, sem gravar. */
  dryRun?: boolean;
  /** `insert` (padrão, T09): existentes não mudam. `upsert` (T10): atualiza o que for confirmado. */
  mode?: "insert" | "upsert";
  /** Em `upsert`: permite reativar veículos inativos trazidos pela planilha. */
  reactivate?: boolean;
  /** Em `upsert`: ids dos veículos cujas diferenças o usuário confirmou. */
  confirmIds?: string[];
}

/** Corpo do relatório de importação. */
interface ImportReport {
  dryRun: boolean;
  mode: "insert" | "upsert";
  created: CreatedItem[];
  /** Só em `upsert`. */
  updated?: UpdatedItem[];
  /** Só em `upsert`. */
  unchanged?: UnchangedItem[];
  skipped: SkippedItem[];
  failed: ItemFailure[];
  /** Tipos de veículo informados que não existem (ativos) no cadastro, sem repetição. */
  missingVehicleTypes: string[];
}

/** Resposta do serviço (mesmo formato `{ status, message, data? }` dos demais). */
interface BulkResult {
  status: number;
  message: string;
  data?: ImportReport;
}

type WithType = ValidVehicleItem & { typeVehicleId: string };

/**
 * Importação de veículos em lote: valida tudo antes de gravar, grava numa única transação
 * (tudo ou nada) e devolve um relatório por item. Em `insert` (T09) veículos existentes não são
 * alterados; em `upsert` (T10) as diferenças são recalculadas aqui e só as confirmadas são gravadas.
 */
class VehicleBulkService {
  /**
   * Importa veículos de uma empresa.
   * @param payload Empresa, usuário autenticado (do token) e lista de veículos.
   * @param options Ver {@link ImportOptions}.
   */
  async importVehicles(
    payload: { companyId?: unknown; userId?: unknown; vehicles?: unknown },
    options: ImportOptions = {}
  ): Promise<BulkResult> {
    const dryRun = options.dryRun === true;
    const mode = options.mode ?? "insert";
    const upsert = mode === "upsert";
    const confirmed = new Set(options.confirmIds ?? []);
    const { companyId, userId, vehicles } = payload;

    if (typeof userId !== "string" || !userId) return { status: 401, message: "Usuário não identificado." };
    if (typeof companyId !== "string" || !UUID_REGEX.test(companyId)) {
      return { status: 400, message: "Id da empresa não informado ou inválido." };
    }
    if (!Array.isArray(vehicles) || vehicles.length === 0) return { status: 400, message: "Lista de veículos vazia." };
    if (vehicles.length > MAX_BULK_ITEMS) return { status: 400, message: `Máximo de ${MAX_BULK_ITEMS} veículos por importação.` };

    // A empresa vive no `registry`: consulta por HTTP (token de serviço). Falha de rede não é "empresa inexistente".
    try {
      const companies = await fetchCompaniesStrict([companyId]);
      if (!companies.some((c: { companyId?: string }) => c.companyId === companyId)) {
        return { status: 400, message: "Empresa não encontrada ou inativa." };
      }
    } catch (error) {
      if (error instanceof RegistryUnavailableError) {
        return { status: 503, message: "Não foi possível verificar a empresa no módulo de cadastro. Tente novamente." };
      }
      throw error;
    }

    const { valid, failed } = validateVehicleItems(vehicles);

    // Veículos já cadastrados (número ou placa; inativos continuam ocupando os valores)
    const numbers = valid.map(v => v.vehicleNumber);
    const plates = valid.flatMap(v => plateVariants(v.plateKey));
    const existing = valid.length
      ? await VehicleModel.findAll({
          where: { [Op.or]: [{ vehicleNumber: { [Op.in]: numbers } }, { licensePlate: { [Op.in]: plates } }] },
          attributes: upsert
            ? ["vehicleId", "vehicleNumber", "fkVehicleCompanyId", "licensePlate", "chassisNumber", "renavan", "brand", "model",
               "fabricationYear", "modelYear", "fkTypeVehicleId", "capacity", "hasWifi", "cameraType", "activated"]
            : ["vehicleId", "vehicleNumber", "licensePlate", "activated"],
        })
      : [];
    const byNumber = new Map(existing.map(e => [e.vehicleNumber, e]));
    const byPlate = new Map(existing.map(e => [plateKey(e.licensePlate), e]));

    const skipped: SkippedItem[] = [];
    const candidates: ValidVehicleItem[] = [];
    const toCompare: ValidVehicleItem[] = [];
    const conflict = (item: ValidVehicleItem, field: string, error: string) =>
      failed.push({ line: item.line, vehicleNumber: item.vehicleNumber, field, code: "CONFLICT", error });
    const inactiveError = (id: string) =>
      `Veículo já existe como registro inativo (id: ${id}). Reative-o em PATCH /vehicle/${id}/reactivate` + (upsert ? " ou importe com reactivate=true." : ".");

    valid.forEach(item => {
      const a = byNumber.get(item.vehicleNumber);
      const b = byPlate.get(item.plateKey);
      if (!a && !b) return void candidates.push(item);
      // upsert: o número é a chave; a placa pode mudar, desde que não seja de outro veículo
      if (upsert && a) {
        if (b && b.vehicleId !== a.vehicleId) return void conflict(item, "licensePlate", "Placa já usada por outro veículo.");
        if (!a.activated && options.reactivate !== true) return void conflict(item, "vehicleNumber", inactiveError(a.vehicleId));
        return void toCompare.push(item);
      }
      if (a && b && a.vehicleId === b.vehicleId) {
        if (a.activated) {
          skipped.push({ line: item.line, vehicleNumber: item.vehicleNumber, vehicleId: a.vehicleId, reason: "Veículo já cadastrado." });
        } else {
          conflict(item, "vehicleNumber", inactiveError(a.vehicleId));
        }
        return;
      }
      if (a && b) conflict(item, "licensePlate", "Número e placa pertencem a veículos diferentes já cadastrados.");
      else if (a) conflict(item, "vehicleNumber", "Número já usado por um veículo com outra placa.");
      else conflict(item, "licensePlate", "Placa já usada por um veículo com outro número.");
    });

    // Chassi e renavam não são únicos no banco, mas identificam o veículo: duplicidade é erro
    const dupVehicles = candidates.length
      ? await VehicleModel.findAll({
          where: { [Op.or]: [{ chassisNumber: { [Op.in]: candidates.map(c => c.chassisNumber) } }, { renavan: { [Op.in]: candidates.map(c => c.renavan) } }] },
          attributes: ["vehicleId", "chassisNumber", "renavan"],
        })
      : [];
    const byChassis = new Map(dupVehicles.map(v => [v.chassisNumber, v]));
    const byRenavan = new Map(dupVehicles.map(v => [v.renavan, v]));
    const fresh: ValidVehicleItem[] = [];
    candidates.forEach(item => {
      const ch = byChassis.get(item.chassisNumber);
      const rn = byRenavan.get(item.renavan);
      if (ch) conflict(item, "chassisNumber", `Chassi já cadastrado em outro veículo (id: ${ch.vehicleId}).`);
      if (rn) conflict(item, "renavan", `Renavam já cadastrado em outro veículo (id: ${rn.vehicleId}).`);
      if (!ch && !rn) fresh.push(item);
    });

    // Tipos de veículo: comparação exata (sem acento nem caixa), só ativos
    const types = fresh.length || toCompare.length
      ? await VehicleTypeModel.findAll({ where: { activated: true }, attributes: ["typeVehicleId", "typeVehicleName"] })
      : [];
    const typesByKey = new Map<string, string[]>();
    types.forEach(t => {
      const key = normalizeText(t.typeVehicleName);
      typesByKey.set(key, [...(typesByKey.get(key) ?? []), t.typeVehicleId]);
    });
    const missingVehicleTypes = new Set<string>();
    const planned: (WithType & { vehicleId: string })[] = [];
    const compareWithType: WithType[] = [];
    [...fresh, ...toCompare].forEach(item => {
      const ids = typesByKey.get(item.typeKey) ?? [];
      if (ids.length === 1) {
        if (byNumber.has(item.vehicleNumber)) return void compareWithType.push({ ...item, typeVehicleId: ids[0] });
        return void planned.push({ ...item, vehicleId: randomUUID(), typeVehicleId: ids[0] });
      }
      if (ids.length === 0) missingVehicleTypes.add(item.typeVehicleName);
      failed.push({
        line: item.line, vehicleNumber: item.vehicleNumber, field: "typeVehicleName", code: "INVALID",
        error: ids.length === 0 ? `Tipo de veículo '${item.typeVehicleName}' não cadastrado.` : `Tipo de veículo '${item.typeVehicleName}' ambíguo: há mais de um tipo ativo com esse nome.`,
      });
    });

    const { updated, unchanged, updates } = upsert
      ? await this.planUpdates(compareWithType, byNumber as unknown as Map<string, CurrentVehicle>, companyId, confirmed, skipped, failed)
      : { updated: [] as UpdatedItem[], unchanged: [] as UnchangedItem[], updates: [] as PlannedUpdate[] };

    failed.sort((x, y) => x.line - y.line);
    const preview: CreatedItem[] = planned.map(p => ({ line: p.line, vehicleNumber: p.vehicleNumber, vehicleId: p.vehicleId }));
    const report = (created: CreatedItem[], applied: UpdatedItem[] = updated): ImportReport => ({
      dryRun, mode, created,
      ...(upsert ? { updated: applied, unchanged } : {}),
      skipped, failed, missingVehicleTypes: [...missingVehicleTypes],
    });

    if (failed.length) {
      return { status: 400, message: "Importação rejeitada: nenhum registro foi gravado. Corrija os itens com erro e envie de novo.", data: report([], []) };
    }
    if (dryRun) return { status: 200, message: "Simulação concluída: nenhum registro foi gravado.", data: report(preview) };
    if (!planned.length && !updates.length) {
      return {
        status: 200,
        message: upsert ? "Nada a gravar: nenhum veículo novo nem alteração confirmada." : "Nenhum veículo novo: todos já estavam cadastrados.",
        data: report([]),
      };
    }

    const transaction = await db.transaction();
    try {
      const now = new Date();
      if (planned.length) {
        await VehicleModel.bulkCreate(
          planned.map(p => ({
            vehicleId: p.vehicleId, vehicleNumber: p.vehicleNumber, fkVehicleCompanyId: companyId, brand: p.brand,
            licensePlate: p.licensePlate, chassisNumber: p.chassisNumber, fabricationYear: p.fabricationYear, modelYear: p.modelYear,
            renavan: p.renavan, fkTypeVehicleId: p.typeVehicleId, capacity: p.capacity, model: p.model, hasWifi: p.hasWifi,
            cameraType: p.cameraType, activated: true, createdBy: userId,
            // No banco, `vehicle.updated_by` é NOT NULL: na criação usa o próprio autor (igual ao cadastro unitário).
            updatedBy: userId, createdAt: now,
          })),
          { transaction }
        );
      }
      await this.applyUpdates(updates, userId, now, transaction);
      await transaction.commit();
      const message = upsert
        ? `${planned.length} veículo(s) criado(s) e ${updates.length} atualizado(s).`
        : `${planned.length} veículo(s) importado(s) com sucesso.`;
      return { status: planned.length ? 201 : 200, message, data: report(preview) };
    } catch (error: unknown) {
      await transaction.rollback();
      if (error instanceof UniqueConstraintError) {
        return { status: 409, message: "Conflito de unicidade durante a gravação (número ou placa cadastrados por outra requisição). Nenhum registro foi gravado; tente novamente." };
      }
      logError("importVehicles", error);
      return { status: 500, message: "Erro interno ao importar veículos. Nenhum registro foi gravado." };
    }
  }

  /**
   * Compara os itens existentes com o cadastro (T10) e separa: inalterados, atualizações
   * confirmadas, diferenças não confirmadas (em `skipped`) e conflitos de identidade (em `failed`).
   */
  private async planUpdates(
    items: WithType[],
    byNumber: Map<string, CurrentVehicle>,
    companyId: string,
    confirmed: Set<string>,
    skipped: SkippedItem[],
    failed: ItemFailure[]
  ): Promise<{ updated: UpdatedItem[]; unchanged: UnchangedItem[]; updates: PlannedUpdate[] }> {
    const updated: UpdatedItem[] = [];
    const unchanged: UnchangedItem[] = [];
    const updates: PlannedUpdate[] = [];
    if (!items.length) return { updated, unchanged, updates };

    const vehicles = items.map(i => byNumber.get(i.vehicleNumber) as CurrentVehicle);
    const typeIds = [...new Set(vehicles.map(v => v.fkTypeVehicleId))];
    const currentTypes = await VehicleTypeModel.findAll({ where: { typeVehicleId: { [Op.in]: typeIds } }, attributes: ["typeVehicleId", "typeVehicleName"] });
    const typeName = new Map(currentTypes.map(t => [t.typeVehicleId, t.typeVehicleName]));

    items.forEach((item, index) => {
      const vehicle = vehicles[index];
      const base = { line: item.line, vehicleNumber: item.vehicleNumber, vehicleId: vehicle.vehicleId };
      const result = compareVehicle({
        item, typeVehicleId: item.typeVehicleId, companyId, vehicle, currentTypeName: typeName.get(vehicle.fkTypeVehicleId) ?? null,
      });
      if (isConflict(result)) {
        failed.push({ line: item.line, vehicleNumber: item.vehicleNumber, field: result.conflict.field, code: "CONFLICT", error: result.conflict.error });
        return;
      }
      if (!result.changes.length) return void unchanged.push(base);
      if (!confirmed.has(vehicle.vehicleId)) {
        return void skipped.push({ ...base, reason: "Alteração não confirmada (inclua o id em confirmIds).", changes: result.changes });
      }
      updated.push({ ...base, changes: result.changes });
      updates.push({ ...base, changes: result.changes, patch: result.patch });
    });
    return { updated, unchanged, updates };
  }

  /** Grava as atualizações confirmadas dentro da transação da importação, com o autor do token. */
  private async applyUpdates(updates: PlannedUpdate[], userId: string, now: Date, transaction: Transaction): Promise<void> {
    for (const u of updates) {
      await VehicleModel.update({ ...u.patch, updatedBy: userId, updatedAt: now }, { where: { vehicleId: u.vehicleId }, transaction });
    }
  }
}

export default VehicleBulkService;
