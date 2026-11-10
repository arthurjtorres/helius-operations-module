import { ModelStatic } from "sequelize";
import { BusTimetableModel, LocationModel } from "../database/models";
import BusTimetableInterface from "../database/interfaces/BusTimetableInterface";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";

import { Op } from "sequelize";

/** Includes das localizações de início e fim, restritos a registros ativos. */
const locationIncludes = () => [
  { model: LocationModel, as: "StartLocation", where: { activated: true }, required: false },
  { model: LocationModel, as: "EndLocation", where: { activated: true }, required: false },
];

class BusTimetableService {
  private model: ModelStatic<BusTimetableModel> = BusTimetableModel;

  async createBusTimetable(data: BusTimetableInterface) {
    data.createdAt = new Date();

    const { error } = CreateValidationSchema.BusTimetableValidation.validate(data);

    if (error) return Response.badRequest(error.message);

    await this.model.create({ ...data });
    return Response.created("Tabela de horário criada com sucesso!");
  }

   async updateBusTimetable(id: string, data: Partial<BusTimetableInterface>) {
    if (!id) return Response.badRequest("ID não informado");
    data.updatedAt = new Date();

    const { error } = UpdateValidationSchema.BusTimetableValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const [updated] = await this.model.update(data, {
      where: { busTimetableId: id, activated: true },
    });

    if (!updated) return Response.notFound("Tabela de horário não encontrada!");

    const result = await this.model.findOne({
      where: { busTimetableId: id, activated: true },
      include: locationIncludes(),
    });

    return Response.ok("Tabela de horário atualizada com sucesso!", result);
  }

  /**
   * Desativa o registro (exclusão lógica): `activated = false`.
   *
   * @param id Identificador da tabela de horário.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async deleteBusTimetable(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const [updated] = await this.model.update(
      { activated: false, updatedBy, updatedAt: new Date() },
      { where: { busTimetableId: id, activated: true } }
    );
    if (!updated) return Response.notFound("Tabela de horário não encontrada!");

    return Response.ok("Tabela de horário desativada com sucesso!");
  }

  /**
   * Reativa uma tabela de horário desativada (`activated = true`).
   * Responde 409 se a localização de início ou de fim estiver inativa.
   *
   * @param id Identificador da tabela de horário.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async reactivateBusTimetable(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const timetable = await this.model.findOne({ where: { busTimetableId: id, activated: false } });
    if (!timetable) return Response.notFound("Tabela de horário não encontrada ou já ativa!");

    const activeLocations = await LocationModel.count({
      where: {
        activated: true,
        locationId: { [Op.in]: [timetable.fkBusTimetableLocationStartId, timetable.fkBusTimetableLocationEndId] },
      },
    });
    const needed = timetable.fkBusTimetableLocationStartId === timetable.fkBusTimetableLocationEndId ? 1 : 2;
    if (activeLocations < needed) {
      return Response.conflict("Não é possível reativar: a localização de início ou de fim está inativa.");
    }

    await timetable.update({ activated: true, updatedBy, updatedAt: new Date() });
    return Response.ok("Tabela de horário reativada com sucesso!");
  }

  async getBusTimetable(id: string) {
    if (!id) return Response.badRequest("ID da tabela não informado.");

    const result = await this.model.findOne({
      where: { busTimetableId: id, activated: true },
      include: locationIncludes(),
    });

    if (!result) return Response.notFound("Tabela de horário não encontrada!");
    return Response.ok("Tabela de horário encontrada!", result);
  }


  async findBusTimetables(query: Partial<BusTimetableInterface>) {
    const where: any = { activated: true };
    if (query.busTimetableId) {
      where.busTimetableId = query.busTimetableId;
    }
    if (query.timetableName) {
      where.timetableName = { [Op.iLike]: `%${query.timetableName}%` };
    }
    if (query.timetableCode) {
      where.timetableCode = { [Op.iLike]: `%${query.timetableCode}%` };
    }
    if (query.startDate) {
      where.startDate = query.startDate;
    }
    if (query.endDate) {
      where.endDate = query.endDate;
    }
    if (query.fkBusTimetableLocationStartId) {
      where.fkBusTimetableLocationStartId = query.fkBusTimetableLocationStartId;
    }
    if (query.fkBusTimetableLocationEndId) {
      where.fkBusTimetableLocationEndId = query.fkBusTimetableLocationEndId;
    }
    const result = await this.model.findAll({
      where,
      include: locationIncludes(),
    });

    if (!result.length) {
      return Response.notFound("Nenhuma tabela de horário encontrada.");
    }

    return Response.ok("Tabelas de horário encontradas com sucesso", result);
  }
}


export default BusTimetableService;
