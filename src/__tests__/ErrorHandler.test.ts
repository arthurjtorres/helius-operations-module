import { Request, Response } from 'express';
import { errorHandler } from '../middlewares/ErrorHandler';

const mockRes = (headersSent = false) => {
  const res: any = { headersSent };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
};
const req = { method: 'POST', path: '/vehicle' } as Request;

describe('errorHandler', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => { spy = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => spy.mockRestore());

  it('erro genérico: 500 padronizado sem err.message', () => {
    const res = mockRes();
    errorHandler(new Error('relation "x" does not exist'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: 500, message: 'Erro interno do servidor' });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('relation');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('JSON inválido (body-parser): mantém 400 com mensagem genérica', () => {
    const res = mockRes();
    const err = Object.assign(new SyntaxError('Unexpected token } in JSON at position 10'), {
      type: 'entity.parse.failed', status: 400, body: '{"senha": "x"}',
    });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ status: 400, message: 'Requisição inválida.' });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('senha');
  });

  it('corpo grande demais (body-parser): mantém 413', () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 }), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('resposta já enviada: delega ao next', () => {
    const res = mockRes(true);
    const next = jest.fn();
    const err = new Error('x');
    errorHandler(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
