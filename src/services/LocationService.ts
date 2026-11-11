import { ModelStatic, Op } from "sequelize";
import { LocationModel, BusTimetableModel } from "../database/models";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";
import LocationInterface from "../database/interfaces/LocationInterface";
import { parseIdList } from "../utils/IdList";

class LocationService {
  private model: ModelStatic<LocationModel> = LocationModel;

  async createLocation(data: LocationInterface) {
    data.createdAt = new Date();

    const { error } = CreateValidationSchema.LocationValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    await this.model.create({ ...data });
    return Response.created("Localização criada com sucesso!");
  }

  async updateLocation(id: string, data: Partial<LocationInterface>) {

    if (!id) return Response.badRequest("ID não informado");
    data.updatedAt = new Date();

    const { error } = UpdateValidationSchema.LocationValidation.validate(data);
    if (error) return Response.badRequest(error.message);

    const [updated] = await this.model.update(data, { where: { locationId: id, activated: true } });
    if (!updated) return Response.notFound("Localização não encontrada!");

    const result = await this.model.findOne({ where: { locationId: id, activated: true } });
    return Response.ok("Localização atualizada com sucesso!", result);
  }

  /**
   * Desativa o registro (exclusão lógica): `activated = false`.
   * Bloqueia (409) se houver tabelas de horário ativas que usam o local (início ou fim).
   *
   * @param id Identificador da localização.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async deleteLocation(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const dependents = await BusTimetableModel.count({
      where: {
        activated: true,
        [Op.or]: [{ fkBusTimetableLocationStartId: id }, { fkBusTimetableLocationEndId: id }],
      },
    });
    if (dependents > 0) {
      return Response.conflict("Não é possível desativar: a localização é usada por tabelas de horário ativas.");
    }

    const [updated] = await this.model.update(
      { activated: false, updatedBy, updatedAt: new Date() },
      { where: { locationId: id, activated: true } }
    );
    if (!updated) return Response.notFound("Localização não encontrada!");

    return Response.ok("Localização desativada com sucesso!");
  }

  /**
   * Reativa uma localização desativada (`activated = true`).
   *
   * @param id Identificador da localização.
   * @param updatedBy Usuário autenticado que executa a operação.
   */
  async reactivateLocation(id: string, updatedBy: string) {
    if (!id) return Response.badRequest("ID não informado");

    const [updated] = await this.model.update(
      { activated: true, updatedBy, updatedAt: new Date() },
      { where: { locationId: id, activated: false } }
    );
    if (!updated) return Response.notFound("Localização não encontrada ou já ativa!");

    return Response.ok("Localização reativada com sucesso!");
  }

  async getLocation(id: string) {
    if (!id) return Response.badRequest("ID da localização não informado.");

    const result = await this.model.findOne({ where: { locationId: id, activated: true } });
    if (!result) return Response.notFound("Localização não encontrada!");
    return Response.ok("Localização encontrada!", result);
  }

  /**
   * Consulta localizações ativas por lista de IDs (usada por outros módulos, T09).
   * Responde 200 com os encontrados; IDs inexistentes ou inativos são omitidos (lista vazia não é 404).
   * @param ids Lista de UUIDs no corpo da requisição (1 a 500).
   */
  async getLocationsByIds(ids: unknown) {
    const parsed = parseIdList(ids);
    if ("error" in parsed) return Response.badRequest(parsed.error);

    const result = await this.model.findAll({
      where: { locationId: { [Op.in]: parsed.ids }, activated: true },
    });
    return Response.ok("Localizações consultadas com sucesso.", result);
  }

  async findLocations(query: {
    locationName?: string;
    locationType?: string;
    locationCeturbCode?: string;
    locationAcronym?: string;
  }) {
    const where: any = { activated: true };

    if (query.locationName) where.locationName = { [Op.iLike]: `%${query.locationName}%` };
    if (query.locationType) where.locationType = query.locationType;
    if (query.locationCeturbCode) where.locationCeturbCode = query.locationCeturbCode;
    if (query.locationAcronym) where.locationAcronym = { [Op.iLike]: `%${query.locationAcronym}%` };

    const result = await this.model.findAll({ where });

    if (!result.length) {
      return Response.notFound("Nenhuma localização encontrada com os filtros fornecidos.");
    }

    return Response.ok("Localizações encontradas com sucesso", result);
  }
}

export default LocationService;
