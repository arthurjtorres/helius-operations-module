import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import router from "./routes";
import connection from "./database/connection";
import Response from "./utils/Response";
import errorHandler from "./middlewares/ErrorHandler";
import { buildCorsOptions, resolveAllowedOrigins } from "./utils/corsOptions";
import "dotenv/config";

const app = express();

// CORS primeiro: lista exata de origens (CORS_ORIGINS ou fallback), registrada uma vez na subida
const allowedOrigins = resolveAllowedOrigins();
console.log(`[CORS] Origens permitidas: ${allowedOrigins.join(', ') || '(nenhuma)'}`);
app.use(cors(buildCorsOptions(allowedOrigins)));
// Cabeçalhos de segurança (remove X-Powered-By, nosniff etc.). O front só usa XHR com CORS,
// então o Cross-Origin-Resource-Policy padrão (same-origin) não o afeta.
app.use(helmet());

app.use(express.json({ limit: "1mb" })); // importação em lote (até 500 itens)

app.use(router);
app.get('/', (req, res) => res.status(200).send('Rodando operacional aqui!'));
// Healthcheck do Docker: público, sem dado; 503 se o banco não responde
app.get('/health', (_req, res) => {
  connection.authenticate().then(
    () => res.status(200).json(Response.ok('ok')),
    () => res.status(503).json({ status: 503, message: 'Banco de dados indisponível' }),
  );
});

app.use(errorHandler);

export default app;