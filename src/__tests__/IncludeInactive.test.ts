import { Request, Response as ExpressResponse } from 'express';
import { JwtPayload } from '../middlewares/Authentication';
import { checkPermission } from '../middlewares/CheckPermission';
import { PermissionEnum } from '../database/models/enums/PermissionEnum';
import { activeWhere, listQuery } from '../utils/ActiveFilter';

const user = (permissions: string[], p: Partial<JwtPayload> = {}): JwtPayload => ({
  userId: 'u1', userName: 'u', usertag: 'u', email: 'u@example.com', userType: 'COLABORADOR',
  clearance: 'USUARIO', clearanceId: 'c', modules: ['OPERACIONAL'], roles: [],
  allowedMenus: [{ menu: 'VEICULOS', permissions }], ...p,
});
const service = { tokenType: 'service', userId: 'service:x', roles: [], modules: [], allowedMenus: [] } as unknown as JwtPayload;

/** Executa `checkPermission('VEICULOS', READ)` num GET com a query dada. */
const run = (u: JwtPayload, query: Record<string, string>) => {
  const out = { status: 0, next: false, locals: { user: u } as Record<string, unknown> };
  const res = { locals: out.locals, status(c: number) { out.status = c; return this; }, json() { return this; } } as unknown as ExpressResponse;
  checkPermission('VEICULOS', PermissionEnum.READ)({ method: 'GET', query } as unknown as Request, res, () => { out.next = true; });
  return out;
};

describe('includeInactive no checkPermission (T17, regra 2)', () => {
  it('só READ: listagem normal passa; com includeInactive → 403', () => {
    expect(run(user(['READ']), {}).next).toBe(true);
    const out = run(user(['READ']), { includeInactive: 'true' });
    expect(out.status).toBe(403);
    expect(out.locals.includeInactive).toBeUndefined();
  });

  it('READ + UPDATE (ou CREATE/DELETE) passa e marca res.locals', () => {
    for (const extra of ['CREATE', 'UPDATE', 'DELETE']) {
      const out = run(user(['READ', extra]), { includeInactive: 'true' });
      expect(out.next).toBe(true);
      expect(out.locals.includeInactive).toBe(true);
    }
  });

  it('acesso total passa; token de serviço → 403', () => {
    expect(run(user([], { clearance: 'SUPER_ADMIN', allowedMenus: [] }), { includeInactive: 'true' }).locals.includeInactive).toBe(true);
    expect(run(service, { includeInactive: 'true' }).status).toBe(403);
  });
});

describe('ActiveFilter', () => {
  it('activeWhere filtra ativos, exceto com a flag autorizada', () => {
    expect(activeWhere({})).toEqual({ activated: true });
    expect(activeWhere({ includeInactive: true })).toEqual({});
  });

  it('listQuery ignora o texto do cliente e usa só res.locals', () => {
    const req = { query: { includeInactive: 'true', vehicleNumber: 'x' } } as unknown as Request;
    expect(listQuery(req, { locals: {} } as ExpressResponse)).toEqual({ includeInactive: false, vehicleNumber: 'x' });
    expect(listQuery(req, { locals: { includeInactive: true } } as unknown as ExpressResponse).includeInactive).toBe(true);
  });
});
