import { AddressInfo } from 'net';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

// Integração HTTP sobre o app e as rotas reais. O banco nunca é consultado (o middleware barra antes do
// controller): Sequelize real sem conexão, só para os models iniciarem.
jest.mock('../database/connection', () => {
  const { Sequelize } = jest.requireActual('sequelize');
  return { __esModule: true, default: new Sequelize('postgres://zz:zz@127.0.0.1:1/zz', { logging: false }) };
});

const SECRET = 'zz_test_secret_com_mais_de_32_caracteres';
process.env.JWT_SECRET = SECRET;
const ID = '00000000-0000-4000-8000-000000000000';

jest.spyOn(console, 'log').mockImplementation(() => undefined);
const app = require('../app').default;
const indexRouter = require('../routes').default;

/** Lista método e caminho de toda rota montada em `routes/index.ts` (Express 4: router → sub-router → rota). */
const routes: [string, string][] = indexRouter.stack.flatMap((mount: any) => {
  const prefix = mount.regexp.source.match(/^\^\\(\/[\w-]+)/)[1];
  return mount.handle.stack.filter((l: any) => l.route).flatMap((l: any) =>
    Object.keys(l.route.methods).map(m => [m.toUpperCase(), (prefix + l.route.path).replace(/\/$/, '').replace(/:\w+/g, ID)]));
});

// Usuário autenticado comum, sem módulo, menu nem role: não pode nada no registry
const noPermissionToken = jwt.sign({
  userId: ID, userName: 'ZZ_TEST_', usertag: 'zz_test', email: 'zz_test@example.com', userType: 'COMUM',
  clearance: 'USUARIO', clearanceId: ID, modules: [], roles: [], allowedMenus: [], companyIds: [ID],
}, SECRET);

describe('autenticação e permissão em todas as rotas', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise(r => server.close(r)));

  const call = (method: string, path: string, token?: string) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: ['GET', 'HEAD'].includes(method) ? undefined : '{}',
  });

  it('encontra as rotas (evita passar sem testar nada)', () => {
    expect(routes.length).toBeGreaterThan(25);
  });

  it.each(routes)('%s %s sem token: 401', async (method, path) => {
    expect((await call(method, path)).status).toBe(401);
  });

  it.each(routes)('%s %s sem permissão: 403', async (method, path) => {
    expect((await call(method, path, noPermissionToken)).status).toBe(403);
  });
});
