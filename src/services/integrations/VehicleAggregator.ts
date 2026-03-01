import { VehicleModel } from "../../database/models"
import { getCompanyById } from "./integrationService"

export const enrichVehicleData = async ( vehicle: VehicleModel) => {
  try {
    const [company] = await Promise.all([
      getCompanyById(vehicle.fkVehicleCompanyId),
    ]);

    return {
      ...vehicle.toJSON(),
      company,
    };
  } catch (error: any) {
     console.error("Erro ao buscar dados:", error.message);
    return vehicle; // Retorna o dado parcial se falhar
  }
}