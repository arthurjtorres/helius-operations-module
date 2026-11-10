import jwt from "jsonwebtoken";
import 'dotenv/config';
import { NextFunction, Request, Response as ExpressResponse } from "express";
import Response from "../utils/Response";

/** Tamanho mínimo recomendado para o segredo do JWT (apenas aviso, não bloqueia). */
const MIN_SECRET_LENGTH = 32;

/**
 * Lê o segredo do JWT do ambiente.
 * @throws Error se `JWT_SECRET` estiver ausente ou vazio.
 */
const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET não definido ou vazio.');
  }
  return secret;
};

/**
 * Valida o segredo do JWT na inicialização: falha se ausente/vazio e
 * apenas avisa (sem exibir o valor) se tiver menos de 32 caracteres.
 */
const assertJwtSecret = (): void => {
  const secret = getSecret();
  if (secret.length < MIN_SECRET_LENGTH) {
    console.warn(`[AVISO] JWT_SECRET tem menos de ${MIN_SECRET_LENGTH} caracteres; use um segredo mais longo.`);
  }
};

export interface MenuPermission {
  menu: string;
  permissions: string[];
}

export interface UserModuleRole {
  module: string;
  role: string;
}

export interface JwtPayload {
  userId: string;
  userName: string;
  usertag: string;
  email: string;
  userType: string;
  /** Nome do nível de acesso (`clearance_level.clearance_name`). */
  clearance: string;
  /** UUID do nível de acesso (`clearance_level.clearance_id`). */
  clearanceId: string;
  modules: string[];
  roles: UserModuleRole[];
  allowedMenus: MenuPermission[];
}

/**
 * Middleware que exige `Authorization: Bearer <token>` com JWT válido.
 * Em caso de falha responde 401 e não chama `next()`.
 */
const verifyToken = (req: Request, res: ExpressResponse, next: NextFunction) => {
  const [scheme, token] = (req.header('Authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    const resp = Response.unauthorized('Token não fornecido');
    return res.status(resp.status).json({ message: resp.message });
  }

  try {
    res.locals.user = jwt.verify(token, getSecret()) as JwtPayload;
  } catch (error) {
    const resp = Response.unauthorized('Token inválido');
    return res.status(resp.status).json({ message: resp.message });
  }
  next();
}

export { verifyToken, assertJwtSecret };
