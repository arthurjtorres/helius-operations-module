import express from 'express';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { createApiRateLimit } from '../middlewares/ApiRateLimit';

const SECRET = 'zz_test_secret_com_mais_de_32_caracteres';
process.env.JWT_SECRET = SECRET;
const token = (payload: object, secret = SECRET) => jwt.sign(payload, secret);

/** App mínimo: limitador com 2 requisições por janela + rotas falsas. */
const buildApp = () => {
  const app = express();
  app.use(createApiRateLimit(2));
  app.get('/health', (_req, res) => res.sendStatus(200));
  app.get('/x', (_req, res) => res.sendStatus(200));
  return app;
};

describe('createApiRateLimit', () => {
  let server: Server;
  let base: string;

  beforeEach(async () => {
    server = buildApp().listen(0);
    await new Promise<void>(r => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => { await new Promise(r => server.close(r)); });

  const get = (path: string, bearer?: string) =>
    fetch(base + path, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
  const statuses = async (n: number, path: string, bearer?: string) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push((await get(path, bearer)).status);
    return out;
  };

  it('sem token: limita por IP e responde 429 no padrão { status, message }', async () => {
    expect(await statuses(2, '/x')).toEqual([200, 200]);
    const blocked = await get('/x');
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ status: 429, message: expect.any(String) });
  });

  it('usuários diferentes no mesmo IP têm contagens separadas', async () => {
    expect(await statuses(3, '/x', token({ userId: 'zz_a' }))).toEqual([200, 200, 429]);
    expect(await statuses(2, '/x', token({ userId: 'zz_b' }))).toEqual([200, 200]);
  });

  it('token com assinatura inválida conta pelo IP (userId forjado não escapa)', async () => {
    const forged = (id: string) => token({ userId: id }, 'outro_segredo');
    expect([(await get('/x', forged('1'))).status, (await get('/x', forged('2'))).status, (await get('/x', forged('3'))).status])
      .toEqual([200, 200, 429]);
  });

  it('token de serviço e /health não são limitados', async () => {
    expect(await statuses(3, '/x', token({ userId: 'svc', tokenType: 'service' }))).toEqual([200, 200, 200]);
    expect(await statuses(3, '/health')).toEqual([200, 200, 200]);
  });
});
