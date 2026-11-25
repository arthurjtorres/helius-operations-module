import { ModelStatic, Op, WhereAttributeHash } from "sequelize";
import { ListQuery, activeWhere } from "../utils/ActiveFilter";
import db, { VehicleTypeModel, VehicleModel } from "../database/models";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";
import { logError } from "../utils/logError";
import VehicleInterface from "../database/interfaces/VehicleInterface";
import { CameraTypeEnum } from "../database/models/enums/CameraTypeEnum";
import { enrichVehicleData } from "./integrations/VehicleAggregator";
import { parseIdList } from "../utils/IdList";

/** Máximo de IDs por desativação em lote: o mesmo da importação de funcionários (lista "fora da planilha", T19). */
export const MAX_DEACTIVATE_IDS = 5000;
import VehicleBulkService, { ImportOptions } from "./VehicleBulkService";
import { normalizeRenavan } from "../utils/VehicleImport";
import { inCompanyScope } from "../utils/AccessPolicy";

/** Filtro do escopo de empresas (T18); `null` = sem filtro. Fora do escopo = não encontrado (404). */
const scopeWhere = (scope: string[] | null) => (scope ? { fkVehicleCompanyId: { [Op.in]: scope } } : {});

/** Empresa informada fora do escopo do usuário (T18, decisão 2). */
const OUT_OF_SCOPE = "Empresa fora do seu escopo de acesso.";

class VehicleService {
  private model: ModelStatic<VehicleModel> = VehicleModel;

  /**
   * Verifica se `vehicleNumber` ou `licensePlate` já pertencem a outro veículo.
   * Valores de registros inativos continuam ocupados: a resposta informa o id e a rota de reativação.
   *
   * @param data Dados informados (parciais no `PUT`).
   * @param excludeId Veículo a ignorar (o próprio, no `PUT`).
   * @returns Resposta de conflito (409) ou `null` se os valores estiverem livres.
   */
  private async findUniqueConflict(data: Partial<VehicleInterface>, excludeId?: string) {
    const checks: Array<[string, "vehicleNumber" | "licensePlate"]> = [
      ["Número do veículo", "vehicleNumber"],
      ["Placa", "licensePlate"],
    ];

    for (const [label, field] of checks) {
      const value = data[field];
      if (!value) continue;

      const where: WhereAttributeHash = { [field]: value };
      if (excludeId) where.vehicleId = { [Op.ne]: excludeId };

      const existing = await this.model.findOne({ where });
      if (existing) {
        return Response.conflict(
          existing.activated
            ? `${label} já cadastrado(a).`
            : `${label} já existe em um veículo inativo (id: ${existing.vehicleId}). Reative-o em PATCH /vehicle/${existing.vehicleId}/reactivate.`
        );
      }
    }

    return null;
  }

  async createVehicle(data: VehicleInterface, scope: string[] | null = null) {
    data.createdAt = new Date();
    if (typeof data.renavan === "string") data.renavan = normalizeRenavan(data.renavan.trim());

    const { error } = CreateValidationSchema.VehicleValidation.validate(data);
    if (error) return Response.badRequest(error.message);
    if (!inCompanyScope(scope, data.fkVehicleCompanyId)) return Response.forbidden(OUT_OF_SCOPE);

    const conflict = await this.findUniqueConflict(data);
    if (conflict) return conflict;

    // No banco, `vehicle.updated_by` é NOT NULL (diverge do model/ERD): na criação usa o próprio autor.
    await this.model.create({ ...data, updatedBy: data.createdBy });
    return Response.created("Veículo criado com sucesso!");
  }

  async updateVehicle(vehicleId: string, data: Partial<VehicleInterface>, scope: string[] | null = null) {
    data.updatedAt = new Date();
    if (!vehicleId) return Response.badRequest("ID não informado");
    if (typeof data.renavan === "string") data.renavan = normalizeRenavan(data.renavan.trim());

    const { error } = UpdateValidationSchema.VehicleValidation.validate(data);
    if (error) return Response.badRequest(error.message);
    if (data.fkVehicleCompanyId && !inCompanyScope(scope, data.fkVehicleCompanyId)) return Response.forbidden(OUT_OF_SCOPE);

    const conflict = await this.findUniqueConflict(data, vehicleId);
    if (conflict) return conflict;

    const [updated] = await this.model.update(data, { where: { vehicleId, activated: true, ...scopeWhere(scope) } });
    if (!updated) return Response.notFound("Veículo não encontrado!");

    const result = await this.model.findOne({
      where: { vehicleId, activated: true },
      include: [
        { model: VehicleTypeModel, as: 'VehicleType', where: { activated: true }, required: false }
      ],
    });

    return Response.ok("Veículo atualizado com sucesso!", result);
  }

  /**
   * Desativa o registro (exclusão lógica): `activated = false`.
   *
   * @param id Identificador do veículo.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async deleteVehicle(id: string, updatedBy: string, scope: string[] | null = null) {
    if (!id) return Response.badRequest("ID não informado");

    const [updated] = await this.model.update(
      { activated: false, updatedBy, updatedAt: new Date() },
      { where: { vehicleId: id, activated: true, ...scopeWhere(scope) } }
    );
    if (!updated) return Response.notFound("Veículo não encontrado!");

    return Response.ok("Veículo desativado com sucesso!");
  }

  /**
   * Reativa um veículo desativado (`activated = true`).
   * Responde 409 se o tipo de veículo estiver inativo.
   *
   * @param id Identificador do veículo.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async reactivateVehicle(id: string, updatedBy: string, scope: string[] | null = null) {
    if (!id) return Response.badRequest("ID não informado");

    const vehicle = await this.model.findOne({ where: { vehicleId: id, activated: false, ...scopeWhere(scope) } });
    if (!vehicle) return Response.notFound("Veículo não encontrado ou já ativo!");

    const typeActive = await VehicleTypeModel.count({ where: { typeVehicleId: vehicle.fkTypeVehicleId, activated: true } });
    if (!typeActive) {
      return Response.conflict("Não é possível reativar: o tipo de veículo está inativo.");
    }

    await vehicle.update({ activated: true, updatedBy, updatedAt: new Date() });
    return Response.ok("Veículo reativado com sucesso!");
  }

  async getVehicle(id: string, scope: string[] | null = null) {
    if (!id) return Response.badRequest("ID do veículo não informado.");

    try {
      const result = await this.model.findOne({
        where: { vehicleId: id, activated: true, ...scopeWhere(scope) },
        include: [
          { model: VehicleTypeModel, as: 'VehicleType', where: { activated: true }, required: false }
        ],
      });

      if (!result) return Response.notFound("Veículo não encontrado!");

      const enrichedVehicle = await enrichVehicleData(result.toJSON());

      return Response.ok("Veículo encontrado!", enrichedVehicle);
    } catch (error: unknown) {
      logError("getVehicle", error);
      return Response.internalError();
    }

  }

  async findVehicles(query: {
    vehicleNumber?: string;
    licensePlate?: string;
    brand?: string;
    model?: string;
    fabricationYear?: string;
    modelYear?: string;
    cameraType?: CameraTypeEnum;
    hasWifi?: boolean;
    fkTypeVehicleId?: string;
    fkVehicleCompanyId?: string;
  } & ListQuery, scope: string[] | null = null) {

    try {
      if (query.fkVehicleCompanyId && !inCompanyScope(scope, query.fkVehicleCompanyId)) return Response.forbidden(OUT_OF_SCOPE);
      const where: WhereAttributeHash = { ...activeWhere(query), ...scopeWhere(scope) };

      if (query.vehicleNumber) where.vehicleNumber = { [Op.iLike]: `%${query.vehicleNumber}%` };
      if (query.licensePlate) where.licensePlate = { [Op.iLike]: `%${query.licensePlate}%` };
      if (query.brand) where.brand = { [Op.iLike]: `%${query.brand}%` };
      if (query.model) where.model = { [Op.iLike]: `%${query.model}%` };
      if (query.fabricationYear) where.fabricationYear = query.fabricationYear;
      if (query.modelYear) where.modelYear = query.modelYear;
      if (query.cameraType) where.cameraType = query.cameraType;
      if (query.hasWifi !== undefined) where.hasWifi = query.hasWifi;
      if (query.fkTypeVehicleId) where.fkTypeVehicleId = query.fkTypeVehicleId;
      if (query.fkVehicleCompanyId) where.fkVehicleCompanyId = query.fkVehicleCompanyId;

      const vehicles = await this.model.findAll({
        where,
        include: [
          { model: VehicleTypeModel, as: 'VehicleType', where: activeWhere(query), required: false }
        ],
      });

      if (!vehicles.length) {
        return Response.notFound("Nenhum veículo encontrado com os filtros fornecidos.");
      }

      const enrichedVehicles = await Promise.all(vehicles.map(v => enrichVehicleData(v.toJSON())));
      return Response.ok("Veículos encontrados com sucesso", enrichedVehicles);
    } catch (error: unknown) {
      logError("findVehicles", error);
      return Response.internalError();
    }
  }

  /**
   * Consulta veículos ativos por lista de IDs (usada por outros módulos, T09), com o tipo ativo.
   * Responde 200 com os encontrados; IDs inexistentes ou inativos são omitidos (lista vazia não é 404).
   * @param ids Lista de UUIDs no corpo da requisição (1 a 500).
   */
  async lookupVehicles(ids: unknown, scope: string[] | null = null) {
    const parsed = parseIdList(ids);
    if ("error" in parsed) return Response.badRequest(parsed.error);

    const result = await this.model.findAll({
      where: { vehicleId: { [Op.in]: parsed.ids }, activated: true, ...scopeWhere(scope) },
      include: [
        { model: VehicleTypeModel, as: 'VehicleType', where: { activated: true }, required: false }
      ],
    });
    return Response.ok("Veículos consultados com sucesso.", result);
  }

  /**
   * Desativa vários veículos numa transação, tudo ou nada (T19: lista "fora da planilha").
   * Id inexistente ou já inativo cancela o lote (409 com os ids). No módulo não há dependentes
   * que bloqueiem a desativação de veículo.
   * @param ids Lista recebida em `req.body.ids` (UUIDs, máx. `MAX_DEACTIVATE_IDS`).
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async bulkDeactivate(ids: unknown, updatedBy: string, scope: string[] | null = null) {
    const parsed = parseIdList(ids, MAX_DEACTIVATE_IDS);
    if ("error" in parsed) return Response.badRequest(parsed.error);

    const transaction = await db.transaction();
    try {
      const where = { vehicleId: { [Op.in]: parsed.ids }, activated: true, ...scopeWhere(scope) };
      const found = await this.model.findAll({ where, attributes: ["vehicleId"], lock: true, transaction });
      const foundIds = new Set(found.map(v => v.vehicleId));
      const missing = parsed.ids.filter(id => !foundIds.has(id));
      if (missing.length) {
        await transaction.rollback();
        return Response.conflict(`Nada foi desativado: ${missing.length} veículo(s) não encontrado(s) ou já inativo(s).`, { ids: missing });
      }

      await this.model.update({ activated: false, updatedBy, updatedAt: new Date() }, { where, transaction });
      await transaction.commit();
      return Response.ok(`${parsed.ids.length} veículo(s) desativado(s).`, { deactivated: parsed.ids.length });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Importa veículos em lote (T09): valida tudo, grava numa única transação e devolve
   * relatório por item. Ver `VehicleBulkService`.
   * @param payload Empresa, usuário (do token) e lista de veículos.
   * @param options `dryRun`: só valida, sem gravar.
   * @param scope Empresas visíveis (T18); empresa fora → 403.
   */
  async bulkImport(payload: { companyId?: unknown; userId?: unknown; vehicles?: unknown }, options: ImportOptions = {}, scope: string[] | null = null) {
    if (typeof payload.companyId === "string" && !inCompanyScope(scope, payload.companyId)) return Response.forbidden(OUT_OF_SCOPE);
    return new VehicleBulkService().importVehicles(payload, options);
  }
}

export default VehicleService;
