import { ModelStatic, Op } from "sequelize";
import VehicleTypeModel from "../database/models/VehicleTypeModel";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";
import VehicleTypeInterface from "../database/interfaces/VehicleTypeInterface";

class VehicleTypeService {
  private model: ModelStatic<VehicleTypeModel> = VehicleTypeModel;

  async createVehicleType(data: VehicleTypeInterface) {
    data.createdAt = new Date();
    
    const { error } = CreateValidationSchema.VehicleTypeValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    await this.model.create({ ...data });
    return Response.created("Tipo de veículo criado com sucesso!");
  }

  async updateVehicleType(typeVehicleId: string, data: Partial<VehicleTypeInterface>) {
    data.updatedAt = new Date();
    if (!typeVehicleId) return Response.badRequest("ID não informado");

    const { error } = UpdateValidationSchema.UpdateValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const [updated] = await this.model.update(data, { where: { typeVehicleId } });
    if (!updated) return Response.notFound("Tipo de veículo não encontrado!");

    const result = await this.model.findByPk(typeVehicleId);
    return Response.ok("Tipo de veículo atualizado com sucesso!", result);
  }

  async deleteVehicleType(id: string) {
    const deleted = await this.model.destroy({ where: { typeVehicleId: id } });
    if (!deleted) return Response.notFound("Tipo de veículo não encontrado!");

    return Response.ok("Tipo de veículo deletado com sucesso!");
  }

  async getVehicleType(id: string) {
    if (!id) return Response.badRequest("ID do tipo de veículo não informado.");

    const result = await this.model.findByPk(id);
    if (!result) return Response.notFound("Tipo de veículo não encontrado!");
    return Response.ok("Tipo de veículo encontrado!", result);
  }

  async findVehicleTypes(query: { typeVehicleName?: string; airConditioner?: boolean }) {
    const where: any = {};

    if (query.typeVehicleName) {
      where.typeVehicleName = { [Op.iLike]: `%${query.typeVehicleName}%` };
    }

    if (query.airConditioner !== undefined) {
      where.airConditioner = query.airConditioner;
    }

    const result = await this.model.findAll({ where });

    if (!result.length) {
      return Response.notFound("Nenhum tipo de veículo encontrado com os filtros fornecidos.");
    }

    return Response.ok("Tipos de veículo encontrados com sucesso", result);
  }
}

export default VehicleTypeService;
