import { ModelStatic } from "sequelize";
import { BusTimetableModel, LocationModel } from "../database/models";
import BusTimetableInterface from "../database/interfaces/BusTimetableInterface";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";

import { Op } from "sequelize";

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
      where: { busTimetableId : id },
    });

    if (!updated) return Response.notFound("Tabela de horário não encontrada!");

    const result = await this.model.findByPk(id, {
      include: [
        { model: LocationModel, as: "StartLocation" },
        { model: LocationModel, as: "EndLocation" },
      ],
    });

    return Response.ok("Tabela de horário atualizada com sucesso!", result);
  }

  async deleteBusTimetable(id: string) {
    const deleted = await this.model.destroy({ where: { busTimetableId: id } });
    if (!deleted) return Response.notFound("Tabela de horário não encontrada!");

    return Response.ok("Tabela de horário deletada com sucesso!");
  }

  async getBusTimetable(id: string) {
    if (!id) return Response.badRequest("ID da tabela não informado.");

    const result = await this.model.findByPk(id, {
      include: [
        { model: LocationModel, as: "StartLocation" },
        { model: LocationModel, as: "EndLocation" },
      ],
    });

    if (!result) return Response.notFound("Tabela de horário não encontrada!");
    return Response.ok("Tabela de horário encontrada!", result);
  }


  async findBusTimetables(query: Partial<BusTimetableInterface>) {
    const where: any = {};
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
      include: [
        { model: LocationModel, as: "StartLocation" },
        { model: LocationModel, as: "EndLocation" },
      ],
    });

    if (!result.length) {
      return Response.notFound("Nenhuma tabela de horário encontrada.");
    }

    return Response.ok("Tabelas de horário encontradas com sucesso", result);
  }
}


export default BusTimetableService;