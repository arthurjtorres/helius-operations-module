import { JwtPayload } from "../middlewares/Authentication";
import {
  clearanceRank,
  DEVELOPER_ROLE,
  FULL_ACCESS_CLEARANCE,
} from "../database/models/enums/ClearanceEnum";

/** `true` se o token é de serviço entre módulos (ADR-011). */
export const isServiceToken = (user?: JwtPayload): boolean => user?.tokenType === 'service';

/**
 * Administrador com acesso total: clearance ≥ `SUPER_ADMIN` ou role `DESENVOLVEDOR`.
 * Dispensa permissão por menu e módulo. Token de serviço nunca tem acesso total.
 */
export const hasFullAccess = (user?: JwtPayload): boolean => {
  if (!user || isServiceToken(user)) return false;
  if (clearanceRank(user.clearance) >= clearanceRank(FULL_ACCESS_CLEARANCE)) return true;
  return (user.roles ?? []).some(r => r.role === DEVELOPER_ROLE);
};

/** `user_type` do usuário de sistema (bootstrap `admin`): não é filtrado por empresa (T18). */
export const SYSTEM_USER_TYPE = 'SISTEMA';

/** `true` se o usuário é do tipo `SISTEMA` (token de serviço nunca é). */
export const isSystemUser = (user?: JwtPayload): boolean => !!user && !isServiceToken(user) && user.userType === SYSTEM_USER_TYPE;

/**
 * Empresas visíveis ao usuário (T18, ADR-021). Duplicado do `registry` (como o `ClearanceEnum`, ADR-013).
 * @returns `null` = sem filtro (`SISTEMA` ou token de serviço); lista = filtrar por ela.
 *   Token sem `companyIds` (emitido antes do `control` 0.15.0) vê lista vazia.
 */
export const companyScope = (user?: JwtPayload): string[] | null =>
  isServiceToken(user) || isSystemUser(user) ? null : user?.companyIds ?? [];

/** `true` se a empresa está no escopo (`null` = sem filtro). */
export const inCompanyScope = (scope: string[] | null, companyId?: string | null): boolean =>
  scope === null || (!!companyId && scope.includes(companyId));
