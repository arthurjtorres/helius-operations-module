import { axiosRegistry } from "./axiosInstance";
import { registryRoutes } from "./endpoints";

export const getCompanyById = async (id: string) => {
  try {
    const response = await axiosRegistry.get(registryRoutes.getCompanyById(id));
    return response.data?.data || null;
  } catch (error: any) {
    console.error(`Erro ao buscar a empresa ${id}:`, error.message);
    return null;
  }
};

export const getCompaniesByIds = async (ids: string[]) => {
  if (!ids.length) return [];
  try {
    const response = await axiosRegistry.post(registryRoutes.getCompaniesLookup, { ids });
    return response.data?.data || [];
  } catch (error) {
    console.error("Erro ao procurar empresas em lote:", error);
    return [];
  }
};

/** O `registry` não pôde ser consultado (rede, timeout, erro ou resposta inesperada). */
export class RegistryUnavailableError extends Error {}

/**
 * Consulta empresas por IDs no `registry` **sem engolir falhas**: ao contrário de
 * `getCompaniesByIds`, distingue "empresa não existe" (lista sem o id) de "registry fora do ar".
 * Usada na importação em lote, onde confundir os dois casos rejeitaria um lote válido.
 * @param ids Lista de UUIDs.
 * @throws RegistryUnavailableError se a consulta falhar ou a resposta não for uma lista.
 */
export const fetchCompaniesStrict = async (ids: string[]): Promise<{ companyId?: string }[]> => {
  try {
    const response = await axiosRegistry.post(registryRoutes.getCompaniesLookup, { ids });
    if (!Array.isArray(response.data?.data)) throw new Error("resposta inesperada do registry");
    return response.data.data;
  } catch (error: unknown) {
    console.error("Erro ao consultar empresas no registry:", error instanceof Error ? error.message : "desconhecido");
    throw new RegistryUnavailableError(error instanceof Error ? error.message : "falha desconhecida");
  }
};
