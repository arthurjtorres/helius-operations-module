import { getCompanyById } from "./integrationService"
import { logError } from "../../utils/logError";

/**
 * Anexa a empresa (consultada no `registry`) ao veículo já serializado.
 * Em falha, devolve o veículo sem a empresa.
 *
 * @param vehicle Veículo em objeto simples (resultado de `toJSON()`).
 */
export const enrichVehicleData = async <T extends { fkVehicleCompanyId: string }>(vehicle: T) => {
  try {
    const [company] = await Promise.all([
      getCompanyById(vehicle.fkVehicleCompanyId),
    ]);

    return {
      ...vehicle,
      company,
    };
  } catch (error: unknown) {
    logError("enrichVehicleData", error);
    return vehicle; // Retorna o dado parcial se falhar
  }
}