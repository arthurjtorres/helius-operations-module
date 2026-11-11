import express, { NextFunction, Request, Response } from "express";
import cors from 'cors';
import router from "./routes";
import "dotenv/config";

const app = express();

// 1. O CORS DEVE VIR PRIMEIRO DE TUDO
const allowedOrigins = [
  process.env.API_HOST + ':' + process.env.PORT_WEB_MODULE,
  'http://localhost:' + process.env.PORT_WEB_MODULE,
  'http://127.0.0.1:' + process.env.PORT_WEB_MODULE,
]
app.use(cors({

  origin: function (origin, callback) {
    // 1. Permite requisições sem 'origin' (ex: Postman ou apps mobile)
    if (!origin) return callback(null, true);

    // 2. Verifica se a origem está na lista fixa OU se é um IP de rede local
    //const isLocalNetwork = origin.startsWith('http://10.10.') || origin.startsWith('http://192.168.');
    const isAllowed =
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://10.10.') ||
      origin.startsWith('http://192.168.');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`[CORS REJECTED] Origem: ${origin}`);
      callback(new Error('Bloqueado pelo CORS: Origem não permitida.'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-User', 'X-Auth-Pass', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: "1mb" })); // importação em lote (até 500 itens)

app.use(router);
app.get('/', (req, res) => res.status(200).send('Rodando operacional aqui!'));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Erro não tratado:", err);
  return res.status(500).json({ message: "Erro interno do servidor" });
})

export default app;