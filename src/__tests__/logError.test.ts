import { AxiosError, AxiosHeaders } from 'axios';
import { logError, summarizeError } from '../utils/logError';

const sequelizeError = () => {
  const err: any = new Error('duplicate key value violates unique constraint "uq_vehicle_number"');
  err.name = 'SequelizeUniqueConstraintError';
  err.sql = 'INSERT INTO "operational_control"."vehicle" ("name") VALUES ($1)';
  err.parameters = ['ZZ_TEST_valor_secreto'];
  err.parent = { code: '23505', sql: err.sql, detail: 'Key (name)=(ZZ_TEST_valor_secreto) already exists.' };
  err.original = err.parent;
  return err;
};

const axiosError = () => {
  const headers = new AxiosHeaders({ Authorization: 'Bearer token.de.servico' });
  const config: any = { method: 'get', url: '/company/lookup', headers };
  const response: any = { status: 503, data: { segredo: 'corpo da resposta' }, headers: {}, config, statusText: '' };
  return new AxiosError('Request failed with status code 503', 'ERR_BAD_RESPONSE', config, { _header: 'x' }, response);
};

describe('summarizeError', () => {
  it('erro do Sequelize: só nome, mensagem e código do Postgres', () => {
    expect(summarizeError(sequelizeError())).toEqual({
      name: 'SequelizeUniqueConstraintError',
      message: 'duplicate key value violates unique constraint "uq_vehicle_number"',
      dbCode: '23505',
    });
  });

  it('AxiosError: método, URL e status, sem cabeçalhos nem corpo', () => {
    expect(summarizeError(axiosError())).toEqual({
      name: 'AxiosError',
      message: 'Request failed with status code 503',
      method: 'GET',
      url: '/company/lookup',
      status: 503,
    });
  });

  it('valor que não é objeto', () => {
    expect(summarizeError('falhou')).toEqual({ name: 'NonError', message: 'falhou' });
    expect(summarizeError(undefined)).toEqual({ name: 'NonError', message: 'undefined' });
  });
});

describe('logError', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => { spy = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => spy.mockRestore());

  const output = () => spy.mock.calls.map(c => c.map(String).join(' ')).join('\n');

  it('não registra SQL nem parâmetros do Sequelize', () => {
    logError('createVehicle', sequelizeError());
    const out = output();
    expect(out).toContain('createVehicle');
    expect(out).toContain('23505');
    expect(out).not.toContain('INSERT INTO');
    expect(out).not.toContain('ZZ_TEST_valor_secreto');
  });

  it('não registra o Authorization nem o corpo da resposta do Axios', () => {
    logError('getCompaniesByIds', axiosError());
    const out = output();
    expect(out).toContain('/company/lookup');
    expect(out).not.toContain('Bearer');
    expect(out).not.toContain('token.de.servico');
    expect(out).not.toContain('corpo da resposta');
  });

  it('passa uma única string ao console (nunca o objeto)', () => {
    logError('ctx', sequelizeError());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    expect(typeof spy.mock.calls[0][0]).toBe('string');
  });
});
