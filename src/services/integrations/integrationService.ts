import { axiosRegistry } from "./axiosInstance";
import { registryRoutes } from "./endpoints";
import { logError } from "../../utils/logError";

export const getCompanyById = async (id: string) => {
  try {
    const response = await axiosRegistry.get(registryRoutes.getCompanyById(id));
    return response.data?.data || null;
  } catch (error: unknown) {
    logError("getCompanyById", error);
    return null;
  }
};

export const getCompaniesByIds = async (ids: string[]) => {
  if (!ids.length) return [];
  try {
    const response = await axiosRegistry.post(registryRoutes.getCompaniesLookup, { ids });
    return response.data?.data || [];
  } catch (error) {
    logError("getCompaniesByIds", error);
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
    logError("fetchCompaniesStrict", error);
    throw new RegistryUnavailableError(error instanceof Error ? error.message : "falha desconhecida");
  }
};
