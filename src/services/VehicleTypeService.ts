import { ModelStatic, Op } from "sequelize";
import { ListQuery, activeWhere } from "../utils/ActiveFilter";
import { VehicleTypeModel, VehicleModel } from "../database/models";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";
import VehicleTypeInterface from "../database/interfaces/VehicleTypeInterface";
import { normalizeText } from "../utils/VehicleImport";

class VehicleTypeService {
  private model: ModelStatic<VehicleTypeModel> = VehicleTypeModel;

  /**
   * Verifica se já existe outro tipo com o mesmo nome normalizado (sem acento, caixa ou espaços extras),
   * que tornaria a importação ambígua. Ativo tem prioridade; se só houver inativo, a resposta traz o id
   * para reativação. O banco não tem unique no nome.
   *
   * @param name Nome informado.
   * @param excludeId Tipo a ignorar (o próprio, no `PUT`).
   * @returns Resposta de conflito (409) ou `null` se o nome estiver livre.
   */
  private async findNameConflict(name: string, excludeId?: string) {
    const key = normalizeText(name);
    // shortcut: compara em memória (tabela pequena); se os tipos passarem de alguns milhares, mover para o banco (unaccent)
    const same = (await this.model.findAll({ attributes: ["typeVehicleId", "typeVehicleName", "activated"] }))
      .filter(t => t.typeVehicleId !== excludeId && normalizeText(t.typeVehicleName) === key);
    if (same.some(t => t.activated)) return Response.conflict("Já existe um tipo de veículo com este nome.");
    if (same.length) {
      const id = same[0].typeVehicleId;
      return Response.conflict(`Já existe um tipo de veículo inativo com este nome (id: ${id}). Reative-o em PATCH /vehicle-type/${id}/reactivate.`, { id });
    }
    return null;
  }

  async createVehicleType(data: VehicleTypeInterface) {
    data.createdAt = new Date();

    const { error } = CreateValidationSchema.VehicleTypeValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const conflict = await this.findNameConflict(data.typeVehicleName);
    if (conflict) return conflict;

    await this.model.create({ ...data });
    return Response.created("Tipo de veículo criado com sucesso!");
  }

  async updateVehicleType(id: string, data: Partial<VehicleTypeInterface>) {
    if (!id) return Response.badRequest("ID não informado");
    data.updatedAt = new Date();

    const { error } = UpdateValidationSchema.VehicleTypeValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    if (data.typeVehicleName) {
      const conflict = await this.findNameConflict(data.typeVehicleName, id);
      if (conflict) return conflict;
    }

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

  async findVehicleTypes(query: { typeVehicleName?: string; airConditioner?: boolean } & ListQuery) {
    const where: any = { ...activeWhere(query) };

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
