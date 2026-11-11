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
