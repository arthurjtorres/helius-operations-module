import { NextFunction, Request, Response } from "express";
import Resp from "../utils/Response";
import { logError } from "../utils/logError";

/**
 * Handler global de erros do Express.
 *
 * - Erros 4xx do `body-parser` (JSON inválido, corpo grande demais…) mantêm o status,
 *   com mensagem genérica.
 * - Qualquer outro erro vira 500 genérico; o detalhe vai só para o log (`logError`),
 *   nunca `err.message` para o cliente.
 */
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  const e = (typeof err === "object" && err !== null ? err : {}) as { status?: unknown; type?: unknown };
  const isBodyParserError = typeof e.type === "string" && typeof e.status === "number"
    && e.status >= 400 && e.status < 500;

  if (isBodyParserError) {
    const resp = { status: e.status as number, message: "Requisição inválida." };
    return res.status(resp.status).json(resp);
  }

  logError(`${req.method} ${req.path}`, err);
  const resp = Resp.internalError();
  return res.status(resp.status).json(resp);
};

export default errorHandler;
