export const registryRoutes = {
  // --- Rotas Individuais ---
  getCompanyGroupById: (id: string) => `/company-group/${id}`,
  getCorporationById: (id: string) => `/corporation/${id}`,
  getCompanyById: (id: string) => `/company/${id}`,
  
  // --- Rotas em Lote ---
  getCompaniesBulk: `/company/bulk`,
 
}