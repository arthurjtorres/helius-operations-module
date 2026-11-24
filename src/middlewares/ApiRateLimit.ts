import { Request, Response as ExpressResponse } from "express";
import jwt from "jsonwebtoken";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import Response from "../utils/Response";
import { JwtPayload } from "./Authentication";

/** Janela de contagem. */
export const API_WINDOW_MS = 60 * 1000;
/** Requisições por chave (usuário ou IP) na janela; a seguinte recebe 429. */
export const API_MAX_REQUESTS = 100;

/** Payload do token só se a assinatura for válida (chave forjada não escapa do limite). */
const verifiedUser = (req: Request): JwtPayload | undefined => {
  const [scheme, token] = (req.header("Authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) return undefined;
  try {
    return jwt.verify(token, process.env.JWT_SECRET ?? "") as JwtPayload;
  } catch {
    return undefined;
  }
};

/**
 * Limitador geral da API (antes das rotas). Chave: o usuário do token válido, pois vários usuários
 * de uma empresa saem pelo mesmo IP público; sem token válido, o IP. Isentos: `/health` e token de
 * serviço (vem do IP do próprio servidor).
 * shortcut: contador em memória e `req.ip` direto; com várias réplicas ou atrás de proxy/ingress (Kubernetes),
 * usar store compartilhado (Redis) e configurar `trust proxy`.
 * @param limit Requisições por janela (parâmetro só para os testes).
 */
export const createApiRateLimit = (limit = API_MAX_REQUESTS) =>
  rateLimit({
    windowMs: API_WINDOW_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // skip roda antes do keyGenerator: verifica o token uma vez e guarda o resultado
    skip: (req: Request, res: ExpressResponse) => {
      if (req.path === "/health") return true;
      res.locals.rateLimitUser = verifiedUser(req);
      return res.locals.rateLimitUser?.tokenType === "service";
    },
    keyGenerator: (req: Request, res: ExpressResponse) => {
      const user = res.locals.rateLimitUser as JwtPayload | undefined;
      return user ? `user:${user.userId}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
    },
    handler: (_req, res) => {
      const resp = Response.tooManyRequests();
      res.status(resp.status).json(resp);
    },
  });
