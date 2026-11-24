import { NextFunction, Request, Response as ExpressResponse } from "express";
import Response from "../utils/Response";
import { JwtPayload } from "./Authentication";
import { PermissionEnum } from "../database/models/enums/PermissionEnum";
import { hasFullAccess, isServiceToken } from "../utils/AccessPolicy";

/** Nome do módulo em `access_control.module.module_name`. */
const CURRENT_MODULE = 'OPERACIONAL';

/** Métodos que o token de serviço pode usar. */
const SERVICE_SAFE_METHODS = ['GET', 'HEAD'];

/** Opções de `checkPermission`. */
export interface PermissionOptions {
  /**
   * Se `false`, o token de serviço é negado mesmo em `GET` (dado sensível sem consumidor
   * entre módulos, ex.: documentos). Padrão: `true` (serviço lê, nunca escreve; ADR-011).
   */
  allowServiceToken?: boolean;
  /**
   * Rota marcada com o middleware `allowServiceToken` (consulta em lote por `POST`):
   * o token de serviço passa também em métodos de escrita. Preenchido a partir de
   * `res.locals.allowServiceToken`; não deve ser informado manualmente.
   */
  serviceMayPost?: boolean;
}

/** Ações que liberam ver inativos nas listagens (T17, regra 2): qualquer uma além de leitura. */
const INACTIVE_ACTIONS = [PermissionEnum.CREATE, PermissionEnum.UPDATE, PermissionEnum.DELETE];

/**
 * Avalia `?includeInactive=true` (T17): exige `CREATE`, `UPDATE` ou `DELETE` no menu.
 * Token de serviço nunca lista inativos. Devolve `null` se pode, ou a resposta de negação.
 * @param user Payload do JWT (já aprovado por `evaluatePermission`).
 * @param requiredMenu Menu da rota.
 */
export const evaluateInactiveAccess = (user: JwtPayload, requiredMenu: string): { status: number; message: string } | null => {
  if (isServiceToken(user)) return Response.forbidden("Token de serviço não lista registros inativos.");
  return INACTIVE_ACTIONS.some(action => evaluatePermission(user, "GET", requiredMenu, action) === null)
    ? null
    : Response.forbidden(`Ver inativos exige permissão além de leitura em ${requiredMenu}.`);
};

/** Responde a negação (401/403) e interrompe a cadeia. */
const deny = (res: ExpressResponse, resp: { status: number; message: string }) =>
  res.status(resp.status).json({ message: resp.message });

/**
 * Avalia se o usuário pode executar a ação no menu. Devolve `null` se pode,
 * ou a resposta de negação.
 * @param user Payload do JWT.
 * @param method Método HTTP (o token de serviço só lê).
 * @param requiredMenu Menu exigido.
 * @param requiredAction Ação exigida (valor de `permit_list`).
 * @param options Opções (ex.: negar token de serviço).
 */
export const evaluatePermission = (
  user: JwtPayload | undefined,
  method: string,
  requiredMenu: string,
  requiredAction?: PermissionEnum,
  options: PermissionOptions = {}
): { status: number; message: string } | null => {
  if (!user) return Response.unauthorized("Usuário não identificado no contexto.");

  // 1. Token de serviço: só leitura, sem módulo nem menu (ADR-011).
  if (isServiceToken(user)) {
    if (options.allowServiceToken === false) {
      return Response.forbidden(`O menu ${requiredMenu} não é acessível por token de serviço.`);
    }
    return SERVICE_SAFE_METHODS.includes(method) || options.serviceMayPost === true
      ? null
      : Response.forbidden("Token de serviço permite apenas consultas");
  }

  // 2. Administrador (clearance ≥ SUPER_ADMIN) ou role DESENVOLVEDOR: acesso total.
  if (hasFullAccess(user)) return null;

  // 3. Módulo
  if (!(user.modules ?? []).includes(CURRENT_MODULE)) {
    return Response.forbidden(`Este usuário não pertence ao módulo ${CURRENT_MODULE}.`);
  }

  // 4. Menu
  const menuPermission = (user.allowedMenus ?? []).find(m => m.menu === requiredMenu);
  if (!menuPermission) {
    return Response.forbidden(`Este usuário não possui acesso ao menu: ${requiredMenu}`);
  }

  // 5. Ação, lida do array `permit_list`
  if (requiredAction && !(menuPermission.permissions ?? []).includes(requiredAction)) {
    return Response.forbidden(`Ação não permitida: ${requiredAction} em ${requiredMenu}`);
  }

  return null;
};

/**
 * Exige permissão por menu e ação. Deve vir depois de `verifyToken`.
 * @param requiredMenu Menu exigido (`menu.menu_name`).
 * @param requiredAction Ação exigida (`PermissionEnum`).
 * @param options Opções (ex.: `{ allowServiceToken: false }`).
 */
export const checkPermission = (requiredMenu: string, requiredAction?: PermissionEnum, options?: PermissionOptions) =>
  (req: Request, res: ExpressResponse, next: NextFunction) => {
    const user = res.locals.user as JwtPayload | undefined;
    const denied = evaluatePermission(
      user, req.method, requiredMenu, requiredAction,
      { ...options, serviceMayPost: res.locals.allowServiceToken === true }
    );
    if (denied) return deny(res, denied);

    if (req.method === "GET" && req.query?.includeInactive === "true") {
      const inactiveDenied = evaluateInactiveAccess(user as JwtPayload, requiredMenu);
      if (inactiveDenied) return deny(res, inactiveDenied);
      res.locals.includeInactive = true;
    }
    return next();
  };
