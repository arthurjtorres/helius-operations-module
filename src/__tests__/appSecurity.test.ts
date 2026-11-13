import { AddressInfo } from 'net';
import { Server } from 'http';

// App real com rotas simuladas: não carrega models nem abre conexão com o banco
jest.mock('../routes', () => {
  const { Router } = jest.requireActual('express');
  const router = Router();
  router.get('/ping', (_req: unknown, res: any) => res.json({ status: 200, message: 'ok' }));
  return { __esModule: true, default: router };
});

const ALLOWED = 'http://10.0.0.5:1100';

describe('app: CORS e helmet', () => {
  let server: Server;
  let base: string;
  let log: jest.SpyInstance;

  beforeAll(async () => {
    process.env.CORS_ORIGINS = ALLOWED;
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const app = (await import('../app')).default;
    server = app.listen(0);
    await new Promise<void>(r => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    log.mockRestore();
    delete process.env.CORS_ORIGINS;
    await new Promise(r => server.close(r));
  });

  it('helmet: sem X-Powered-By e com nosniff', async () => {
    const res = await fetch(`${base}/ping`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('origem da lista recebe Access-Control-Allow-Origin', async () => {
    const res = await fetch(`${base}/ping`, { headers: { Origin: ALLOWED } });
    expect(res.headers.get('access-control-allow-origin')).toBe(ALLOWED);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('origem fora da lista: sem cabeçalho CORS e sem 500', async () => {
    const res = await fetch(`${base}/ping`, { headers: { Origin: 'http://localhost.evil.com' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('preflight de origem permitida: 204', async () => {
    const res = await fetch(`${base}/ping`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(ALLOWED);
  });

  it('origens registradas uma vez na subida, não por requisição', () => {
    const corsLogs = log.mock.calls.filter(c => String(c[0]).includes('[CORS]'));
    expect(corsLogs).toHaveLength(1);
  });
});
