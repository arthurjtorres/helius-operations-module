/**
 * Registro de erro seguro para o log do servidor.
 *
 * Registra só o contexto e um resumo do erro. Nunca registra `sql`, `parameters`,
 * `config`, `headers`, `request`, `response.data` nem o objeto inteiro: o erro do
 * Sequelize carrega a query com valores e o `AxiosError` carrega o cabeçalho
 * `Authorization` (token de serviço).
 */
export type ErrorSummary = {
  name: string;
  message: string;
  /** Código do Postgres (erros do Sequelize). */
  dbCode?: string;
  /** Requisição HTTP que falhou (erros do Axios). */
  method?: string;
  url?: string;
  status?: number;
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const summarizeError = (error: unknown): ErrorSummary => {
  if (typeof error !== "object" || error === null) {
    return { name: "NonError", message: typeof error === "string" ? error : typeof error };
  }

  const e = error as Record<string, any>;
  const summary: ErrorSummary = {
    name: asString(e.name) ?? "Error",
    message: asString(e.message) ?? "",
  };

  const dbCode = asString(e.parent?.code) ?? asString(e.original?.code);
  if (dbCode) summary.dbCode = dbCode;

  if (e.isAxiosError === true) {
    const method = asString(e.config?.method);
    const url = asString(e.config?.url);
    const status = e.response?.status;
    if (method) summary.method = method.toUpperCase();
    if (url) summary.url = url;
    if (typeof status === "number") summary.status = status;
  }

  return summary;
};

export const logError = (context: string, error: unknown): void => {
  console.error(`[ERRO] ${context}: ${JSON.stringify(summarizeError(error))}`);
};

export default logError;
