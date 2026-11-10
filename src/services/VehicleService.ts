import { ModelStatic, Op } from "sequelize";
import { VehicleTypeModel, VehicleModel } from "../database/models";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";
import VehicleInterface from "../database/interfaces/VehicleInterface";
import { CameraTypeEnum } from "../database/models/enums/CameraTypeEnum";
import { enrichVehicleData } from "./integrations/VehicleAggregator";

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

      const where: any = { [field]: value };
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

  async createVehicle(data: VehicleInterface) {
    data.createdAt = new Date();

    const { error } = CreateValidationSchema.VehicleValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const conflict = await this.findUniqueConflict(data);
    if (conflict) return conflict;

    // No banco, `vehicle.updated_by` é NOT NULL (diverge do model/ERD): na criação usa o próprio autor.
    await this.model.create({ ...data, updatedBy: data.createdBy });
    return Response.created("Veículo criado com sucesso!");
  }

  async updateVehicle(vehicleId: string, data: Partial<VehicleInterface>) {
    data.updatedAt = new Date();
    if (!vehicleId) return Response.badRequest("ID não informado");

    const { error } = UpdateValidationSchema.VehicleValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const conflict = await this.findUniqueConflict(data, vehicleId);
    if (conflict) return conflict;

    const [updated] = await this.model.update(data, { where: { vehicleId, activated: true } });
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
  async deleteVehicle(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const [updated] = await this.model.update(
      { activated: false, updatedBy, updatedAt: new Date() },
      { where: { vehicleId: id, activated: true } }
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
  async reactivateVehicle(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const vehicle = await this.model.findOne({ where: { vehicleId: id, activated: false } });
    if (!vehicle) return Response.notFound("Veículo não encontrado ou já ativo!");

    const typeActive = await VehicleTypeModel.count({ where: { typeVehicleId: vehicle.fkTypeVehicleId, activated: true } });
    if (!typeActive) {
      return Response.conflict("Não é possível reativar: o tipo de veículo está inativo.");
    }

    await vehicle.update({ activated: true, updatedBy, updatedAt: new Date() });
    return Response.ok("Veículo reativado com sucesso!");
  }

  async getVehicle(id: string) {
    if (!id) return Response.badRequest("ID do veículo não informado.");

    try {
      const result = await this.model.findOne({
        where: { vehicleId: id, activated: true },
        include: [
          { model: VehicleTypeModel, as: 'VehicleType', where: { activated: true }, required: false }
        ],
      });

      if (!result) return Response.notFound("Veículo não encontrado!");

      const enrichedVehicle = await enrichVehicleData(result.toJSON());

      return Response.ok("Veículo encontrado!", enrichedVehicle);
    } catch (error: any) {
      console.error("Erro em VehicleService:", error);
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
  }) {

    try {
      const where: any = { activated: true };

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
          { model: VehicleTypeModel, as: 'VehicleType', where: { activated: true }, required: false }
        ],
      });

      if (!vehicles.length) {
        return Response.notFound("Nenhum veículo encontrado com os filtros fornecidos.");
      }

      const enrichedVehicles = await Promise.all(vehicles.map(v => enrichVehicleData(v.toJSON())));
      return Response.ok("Veículos encontrados com sucesso", enrichedVehicles);
    } catch (error: any) {
      console.error("Erro em VehicleService:", error);
      return Response.internalError();
    }
  }

  async getVehiclesByIds(ids: string[]) {
    if (!ids || ids.length === 0) return Response.badRequest("Lista de IDs não informada.");

    const result = await this.model.findAll({
      where: {
        vehicleId: {
          [Op.in]: ids
        },
        activated: true
      },
      include: [
        { model: VehicleTypeModel, as: 'VehicleType', where: { activated: true }, required: false }
      ],
    });

    if (!result.length) return Response.notFound("Nenhum veículo encontrado para os IDs fornecidos.");

    return Response.ok("Veículos encontrados com sucesso!", result);
  }

}

export default VehicleService;
