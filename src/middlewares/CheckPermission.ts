import { NextFunction, Request, Response as ExpressResponse } from "express";
import Response, { StandardResponse } from "../utils/Response";
import { JwtPayload } from "./Authentication";

const CURRENT_MODULE = 'OPERACIONAL';

export const checkPermission = (requiredMenu: string, requiredAction?: string) => {
  return (req: Request, res: ExpressResponse, next: NextFunction) => {

    const user = res.locals.user as JwtPayload;

    if (!user) {
      return Response.unauthorized("Usuário não identificado no contexto.");
    }

    const isDev = user.roles.some(r => r.role === 'DESENVOLVEDOR');

    // 1. Regra do Desenvolvedor: SUPER_ADMIN ou DESENVOLVEDOR passa direto
    if (user.userType === 'SISTEMA' ||
      user.clearance === 'SUPER_ADMIN' ||
      user.clearance === 'SYSTEM_ADMIN' ||
      isDev) {
      return next();
    }

    // 2. Regra de Módulo: Verifica se o usuário pertence ao módulo JURIDICO
    if (!user.modules.includes(CURRENT_MODULE)) {
      return Response.forbidden(`Este usuário não pertence ao módulo ${CURRENT_MODULE}.`);
    }

    // 3. Regra de Menu: Busca o objeto de permissão do menu específico
    const menuPermission = user.allowedMenus.find(m => m.menu === requiredMenu);

    if (!menuPermission) {
      return Response.forbidden(`Este usuário não possui acesso ao menu: ${requiredMenu}`);
    }

    if (requiredAction) {
      const hasPermission = menuPermission.permissions.includes(requiredAction);

      if (!hasPermission) {
        Response.forbidden(`Ação não permitida: ${requiredAction} em ${requiredMenu}`);
      }
    }

    next();
  };
};