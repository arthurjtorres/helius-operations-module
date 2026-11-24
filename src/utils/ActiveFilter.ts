import { Request, Response } from "express";

/** Flag de inativos nas listagens (T17). Só chega `true` quando o `checkPermission` autorizou. */
export type ListQuery = { includeInactive?: boolean };

/** Filtro de `activated` da listagem: sem filtro quando os inativos foram autorizados. */
export const activeWhere = (query: ListQuery) => (query.includeInactive === true ? {} : { activated: true });

/**
 * Query da listagem com a flag lida de `res.locals` (gravada pelo `checkPermission`),
 * nunca do texto enviado pelo cliente.
 */
export const listQuery = (req: Request, res: Response) =>
  ({ ...req.query, includeInactive: res.locals.includeInactive === true });
