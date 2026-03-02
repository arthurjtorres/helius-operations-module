import { ModelStatic, Op } from "sequelize";
import { LocationModel } from "../database/models";
import CreateValidationSchema from "./validations/CreateValidationSchema";
import UpdateValidationSchema from "./validations/UpdateValidationSchema";
import Response from "../utils/Response";
import LocationInterface from "../database/interfaces/LocationInterface";

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

    const [updated] = await this.model.update(data, { where: { locationId: id } });
    if (!updated) return Response.notFound("Localização não encontrada!");

    const result = await this.model.findByPk(id);
    return Response.ok("Localização atualizada com sucesso!", result);
  }

  async deleteLocation(id: string) {
    const deleted = await this.model.destroy({ where: { locationId: id } });
    if (!deleted) return Response.notFound("Localização não encontrada!");

    return Response.ok("Localização deletada com sucesso!");
  }

  async getLocation(id: string) {
    if (!id) return Response.badRequest("ID da localização não informado.");

    const result = await this.model.findByPk(id);
    if (!result) return Response.notFound("Localização não encontrada!");
    return Response.ok("Localização encontrada!", result);
  }

  async findLocations(query: {
    locationName?: string;
    locationType?: string;
    locationCeturbCode?: string;
    locationAcronym?: string;
  }) {
    const where: any = {};

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
