import { ModelStatic, Op } from "sequelize";
import { VehicleTypeModel, VehicleModel } from "../database/models";
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

  async updateVehicleType(id: string, data: Partial<VehicleTypeInterface>) {
    if (!id) return Response.badRequest("ID não informado");
    data.updatedAt = new Date();

    const { error } = UpdateValidationSchema.VehicleTypeValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const [updated] = await this.model.update(data, { where: { typeVehicleId: id, activated: true } });
    if (!updated) return Response.notFound("Tipo de veículo não encontrado!");

    const result = await this.model.findOne({ where: { typeVehicleId: id, activated: true } });
    return Response.ok("Tipo de veículo atualizado com sucesso!", result);
  }

  /**
   * Desativa o registro (exclusão lógica): `activated = false`.
   * Bloqueia (409) se houver veículos ativos deste tipo.
   *
   * @param id Identificador do tipo de veículo.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async deleteVehicleType(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    if (await VehicleModel.count({ where: { fkTypeVehicleId: id, activated: true } }) > 0) {
      return Response.conflict("Não é possível desativar: o tipo de veículo possui veículos ativos.");
    }

    const [updated] = await this.model.update(
      { activated: false, updatedBy, updatedAt: new Date() },
      { where: { typeVehicleId: id, activated: true } }
    );
    if (!updated) return Response.notFound("Tipo de veículo não encontrado!");

    return Response.ok("Tipo de veículo desativado com sucesso!");
  }

  /**
   * Reativa um tipo de veículo desativado (`activated = true`).
   *
   * @param id Identificador do tipo de veículo.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async reactivateVehicleType(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const [updated] = await this.model.update(
      { activated: true, updatedBy, updatedAt: new Date() },
      { where: { typeVehicleId: id, activated: false } }
    );
    if (!updated) return Response.notFound("Tipo de veículo não encontrado ou já ativo!");

    return Response.ok("Tipo de veículo reativado com sucesso!");
  }

  async getVehicleType(id: string) {
    if (!id) return Response.badRequest("ID do tipo de veículo não informado.");

    const result = await this.model.findOne({ where: { typeVehicleId: id, activated: true } });
    if (!result) return Response.notFound("Tipo de veículo não encontrado!");
    return Response.ok("Tipo de veículo encontrado!", result);
  }

  async findVehicleTypes(query: { typeVehicleName?: string; airConditioner?: boolean }) {
    const where: any = { activated: true };

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
