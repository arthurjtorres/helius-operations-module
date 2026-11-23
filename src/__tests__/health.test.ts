import { AddressInfo } from 'net';
import { Server } from 'http';

// App real sem rotas nem banco: só o authenticate da conexão é simulado
jest.mock('../routes', () => {
  const { Router } = jest.requireActual('express');
  return { __esModule: true, default: Router() };
});
const authenticate = jest.fn();
jest.mock('../database/connection', () => ({ __esModule: true, default: { authenticate } }));

describe('GET /health', () => {
  let server: Server;
  let base: string;
  let log: jest.SpyInstance;

  beforeAll(async () => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const app = (await import('../app')).default;
    server = app.listen(0);
    await new Promise<void>(r => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    log.mockRestore();
    await new Promise(r => server.close(r));
  });

  it('banco respondendo: 200 sem token', async () => {
    authenticate.mockResolvedValueOnce(undefined);
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 200, message: 'ok' });
  });

  it('banco fora: 503', async () => {
    authenticate.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 503, message: 'Banco de dados indisponível' });
  });
});
