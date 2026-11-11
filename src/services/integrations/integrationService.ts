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