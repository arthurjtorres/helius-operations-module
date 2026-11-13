import { CorsOptions } from "cors";

/**
 * Origens permitidas no CORS.
 *
 * `CORS_ORIGINS`: lista separada por vírgula (ex.: `http://<IP-da-VM>:1100`).
 * Vazia → fallback `http://${DB_HOST}:${PORT_WEB_APP}` e `http://localhost:${PORT_WEB_APP}`.
 *
 * O `Origin` é o endereço do **portal** (de onde o front foi carregado), não o IP do
 * usuário: por isso a comparação é exata, sem faixas de IP nem `includes`.
 */
export const resolveAllowedOrigins = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const fromList = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (fromList.length) return [...new Set(fromList)];

  const port = env.PORT_WEB_APP?.trim();
  if (!port) return [];
  const fallback = [`http://localhost:${port}`];
  if (env.DB_HOST?.trim()) fallback.unshift(`http://${env.DB_HOST.trim()}:${port}`);
  return fallback;
};

/**
 * Opções do `cors`: origem fora da lista é recusada com `callback(null, false)`
 * (o navegador bloqueia; sem erro e sem 500). Sem `Origin` (chamada entre módulos,
 * Postman) é permitido.
 */
export const buildCorsOptions = (allowedOrigins: string[]): CorsOptions => ({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    callback(null, allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Auth-User", "X-Auth-Pass", "Accept"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
