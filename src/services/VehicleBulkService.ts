import { randomUUID } from "crypto";
import { Op, UniqueConstraintError } from "sequelize";
import db, { VehicleModel, VehicleTypeModel } from "../database/models";
import { fetchCompaniesStrict, RegistryUnavailableError } from "./integrations/integrationService";
import {
  ItemFailure,
  MAX_BULK_ITEMS,
  normalizeText,
  plateKey,
  plateVariants,
  validateVehicleItems,
  ValidVehicleItem,
} from "../utils/VehicleImport";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Veículo que entraria (ou entrou) na importação. */
interface CreatedItem {
  line: number;
  vehicleNumber: string;
  vehicleId: string;
}

/** Item ignorado porque o veículo já está cadastrado e ativo. */
interface SkippedItem {
  line: number;
  vehicleNumber: string;
  vehicleId: string;
  reason: string;
}

/** Corpo do relatório de importação. */
interface ImportReport {
  dryRun: boolean;
  created: CreatedItem[];
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

/**
 * Importação de veículos em lote (T09): valida tudo antes de gravar, grava numa única
 * transação (tudo ou nada) e devolve um relatório por item. Veículos existentes não são alterados.
 */
class VehicleBulkService {
  /**
   * Importa veículos de uma empresa.
   * @param payload Empresa, usuário autenticado (do token) e lista de veículos.
   * @param options `dryRun`: só valida e relata, sem gravar.
   */
  async importVehicles(
    payload: { companyId?: unknown; userId?: unknown; vehicles?: unknown },
    options: { dryRun?: boolean } = {}
  ): Promise<BulkResult> {
    const dryRun = options.dryRun === true;
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
          attributes: ["vehicleId", "vehicleNumber", "licensePlate", "activated"],
        })
      : [];
    const byNumber = new Map(existing.map(e => [e.vehicleNumber, e]));
    const byPlate = new Map(existing.map(e => [plateKey(e.licensePlate), e]));

    const skipped: SkippedItem[] = [];
    const candidates: ValidVehicleItem[] = [];
    const conflict = (item: ValidVehicleItem, field: string, error: string) =>
      failed.push({ line: item.line, vehicleNumber: item.vehicleNumber, field, code: "CONFLICT", error });

    valid.forEach(item => {
      const a = byNumber.get(item.vehicleNumber);
      const b = byPlate.get(item.plateKey);
      if (!a && !b) return void candidates.push(item);
      if (a && b && a.vehicleId === b.vehicleId) {
        if (a.activated) {
          skipped.push({ line: item.line, vehicleNumber: item.vehicleNumber, vehicleId: a.vehicleId, reason: "Veículo já cadastrado." });
        } else {
          conflict(item, "vehicleNumber", `Veículo já existe como registro inativo (id: ${a.vehicleId}). Reative-o em PATCH /vehicle/${a.vehicleId}/reactivate.`);
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
    const types = fresh.length ? await VehicleTypeModel.findAll({ where: { activated: true }, attributes: ["typeVehicleId", "typeVehicleName"] }) : [];
    const typesByKey = new Map<string, string[]>();
    types.forEach(t => {
      const key = normalizeText(t.typeVehicleName);
      typesByKey.set(key, [...(typesByKey.get(key) ?? []), t.typeVehicleId]);
    });
    const missingVehicleTypes = new Set<string>();
    const planned: (ValidVehicleItem & { vehicleId: string; typeVehicleId: string })[] = [];
    fresh.forEach(item => {
      const ids = typesByKey.get(item.typeKey) ?? [];
      if (ids.length === 1) return void planned.push({ ...item, vehicleId: randomUUID(), typeVehicleId: ids[0] });
      if (ids.length === 0) missingVehicleTypes.add(item.typeVehicleName);
      failed.push({
        line: item.line, vehicleNumber: item.vehicleNumber, field: "typeVehicleName", code: "INVALID",
        error: ids.length === 0 ? `Tipo de veículo '${item.typeVehicleName}' não cadastrado.` : `Tipo de veículo '${item.typeVehicleName}' ambíguo: há mais de um tipo ativo com esse nome.`,
      });
    });

    failed.sort((x, y) => x.line - y.line);
    const preview: CreatedItem[] = planned.map(p => ({ line: p.line, vehicleNumber: p.vehicleNumber, vehicleId: p.vehicleId }));
    const report = (created: CreatedItem[]): ImportReport => ({ dryRun, created, skipped, failed, missingVehicleTypes: [...missingVehicleTypes] });

    if (failed.length) {
      return { status: 400, message: "Importação rejeitada: nenhum registro foi gravado. Corrija os itens com erro e envie de novo.", data: report([]) };
    }
    if (dryRun) return { status: 200, message: "Simulação concluída: nenhum registro foi gravado.", data: report(preview) };
    if (!planned.length) return { status: 200, message: "Nenhum veículo novo: todos já estavam cadastrados.", data: report([]) };

    const transaction = await db.transaction();
    try {
      const now = new Date();
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
      await transaction.commit();
      return { status: 201, message: `${planned.length} veículo(s) importado(s) com sucesso.`, data: report(preview) };
    } catch (error: unknown) {
      await transaction.rollback();
      if (error instanceof UniqueConstraintError) {
        return { status: 409, message: "Conflito de unicidade durante a gravação (número ou placa cadastrados por outra requisição). Nenhum registro foi gravado; tente novamente." };
      }
      console.error("Erro na importação de veículos:", error instanceof Error ? error.message : "desconhecido");
      return { status: 500, message: "Erro interno ao importar veículos. Nenhum registro foi gravado." };
    }
  }
}

export default VehicleBulkService;
