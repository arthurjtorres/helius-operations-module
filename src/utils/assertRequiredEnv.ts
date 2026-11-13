/** Variáveis obrigatórias do `operations` (ver `.env.example`). */
export const REQUIRED_ENV = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASS",
  "JWT_SECRET",
  "PORT_API_OPERACIONAL",
  "PORT_API_CADASTRO",
  "PORT_API_CONTROLE",
];

const isSet = (env: NodeJS.ProcessEnv, name: string) => (env[name] ?? "").trim() !== "";

/**
 * Nomes ausentes ou vazios entre `names`, mais `CORS_ORIGINS|PORT_WEB_APP` quando
 * nenhuma das duas existe (o CORS precisa de uma delas). Nunca lê nem devolve valores.
 */
export const missingEnv = (names: string[], env: NodeJS.ProcessEnv = process.env): string[] => {
  const missing = names.filter((name) => !isSet(env, name));
  if (!isSet(env, "CORS_ORIGINS") && !isSet(env, "PORT_WEB_APP")) missing.push("CORS_ORIGINS|PORT_WEB_APP");
  return missing;
};

/**
 * Falha a subida se faltar variável obrigatória: lista só os **nomes** ausentes
 * e encerra com `process.exit(1)`. Chamar em `server.ts` antes do `listen`.
 */
export const assertRequiredEnv = (names: string[] = REQUIRED_ENV, env: NodeJS.ProcessEnv = process.env): void => {
  const missing = missingEnv(names, env);
  if (!missing.length) return;
  console.error(`[ERRO] Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`);
  process.exit(1);
};

export default assertRequiredEnv;
