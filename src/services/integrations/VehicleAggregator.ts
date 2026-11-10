import { getCompanyById } from "./integrationService"

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
  } catch (error: any) {
     console.error("Erro ao buscar dados:", error.message);
    return vehicle; // Retorna o dado parcial se falhar
  }
}