export const registryRoutes = {
  // --- Rotas Individuais ---
  getCompanyGroupById: (id: string) => `/company-group/${id}`,
  getCorporationById: (id: string) => `/corporation/${id}`,
  getCompanyById: (id: string) => `/company/${id}`,
  
  // --- Consulta por IDs (POST, T09) ---
  getCompaniesLookup: `/company/lookup`,
 
}