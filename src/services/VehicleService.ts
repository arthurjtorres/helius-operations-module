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

  async createVehicle(data: VehicleInterface) {
    data.createdAt = new Date();

    const { error } = CreateValidationSchema.VehicleValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    await this.model.create({ ...data });
    return Response.created("Veículo criado com sucesso!");
  }

  async updateVehicle(vehicleId: string, data: Partial<VehicleInterface>) {
    data.updatedAt = new Date();
    if (!vehicleId) return Response.badRequest("ID não informado");

    const { error } = UpdateValidationSchema.VehicleValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const [updated] = await this.model.update(data, { where: { vehicleId } });
    if (!updated) return Response.notFound("Veículo não encontrado!");

    const result = await this.model.findByPk(vehicleId, {
      include: [
        { model: VehicleTypeModel, as: 'VehicleType' }
      ],
    });

    return Response.ok("Veículo atualizado com sucesso!", result);
  }

  async deleteVehicle(id: string) {
    const deleted = await this.model.destroy({ where: { vehicleId: id } });
    if (!deleted) return Response.notFound("Veículo não encontrado!");

    return Response.ok("Veículo deletado com sucesso!");
  }

  async getVehicle(id: string) {
    if (!id) return Response.badRequest("ID do veículo não informado.");

    try {
      const result = await this.model.findByPk(id, {
        include: [
          { model: VehicleTypeModel, as: 'VehicleType' }
        ],
      });

      if (!result) return Response.notFound("Veículo não encontrado!");

      const enrichedVehicle = await enrichVehicleData(result.toJSON());

      return Response.ok("Veículo encontrado!", enrichedVehicle);
    } catch (error: any) {
      return Response.internalError(error.message);
    }

  }

  async findVehicles(query: {
    vehicleNumber?: string;
    licensePlate?: string;
    brand?: string;
    model?: string;
    year?: string;
    cameraType?: CameraTypeEnum;
    hasWifi?: boolean;
    fkVehicleTypeVehicleId?: string;
    fkVehicleCompanyId?: string;
  }) {

    try {
      const where: any = {};

      if (query.vehicleNumber) where.vehicleNumber = { [Op.iLike]: `%${query.vehicleNumber}%` };
      if (query.licensePlate) where.licensePlate = { [Op.iLike]: `%${query.licensePlate}%` };
      if (query.brand) where.brand = { [Op.iLike]: `%${query.brand}%` };
      if (query.model) where.model = { [Op.iLike]: `%${query.model}%` };
      if (query.year) where.year = query.year;
      if (query.cameraType) where.cameraType = query.cameraType;
      if (query.hasWifi !== undefined) where.hasWifi = query.hasWifi;
      if (query.fkVehicleTypeVehicleId) where.fkVehicleTypeVehicleId = query.fkVehicleTypeVehicleId;
      if (query.fkVehicleCompanyId) where.fkVehicleCompanyId = query.fkVehicleCompanyId;

      const vehicles = await this.model.findAll({
        where,
        include: [
          { model: VehicleTypeModel, as: 'VehicleType' }
        ],
      });

      if (!vehicles.length) {
        return Response.notFound("Nenhum veículo encontrado com os filtros fornecidos.");
      }

      const enrichedVehicles = await Promise.all(vehicles.map(v => enrichVehicleData(v.toJSON())));
      return Response.ok("Veículos encontrados com sucesso", enrichedVehicles);
    } catch (error: any) {
      return Response.internalError(error.message);
    }
  }

  async getVehiclesByIds(ids: string[]) {
    if (!ids || ids.length === 0) return Response.badRequest("Lista de IDs não informada.");

    const result = await this.model.findAll({
      where: {
        vehicleId: {
          [Op.in]: ids
        }
      },
      include: [
        { model: VehicleTypeModel, as: 'VehicleType' }
      ],
    });

    if (!result.length) return Response.notFound("Nenhum veículo encontrado para os IDs fornecidos.");

    return Response.ok("Veículos encontrados com sucesso!", result);
  }

}

export default VehicleService;
