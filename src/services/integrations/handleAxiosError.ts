export const handleAxiosError = (
  module: string,
  method: string,
  error: any
) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    "Erro desconhecido na integração externa";

  console.error(`[${module}] [${method}] - ${message}`);
  return null;
};
