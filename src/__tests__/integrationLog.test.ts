import { AxiosError, AxiosHeaders } from 'axios';
import { format } from 'util';
import { axiosRegistry } from '../services/integrations/axiosInstance';
import {
  fetchCompaniesStrict,
  getCompaniesByIds,
  getCompanyById,
  RegistryUnavailableError,
} from '../services/integrations/integrationService';

jest.mock('../services/integrations/axiosInstance', () => ({
  axiosRegistry: { get: jest.fn(), post: jest.fn() },
}));

const registryGet = axiosRegistry.get as jest.Mock;
const registryPost = axiosRegistry.post as jest.Mock;

/** AxiosError com o token de serviço no cabeçalho e corpo na resposta. */
const axiosError = (method: string, url: string) => {
  const headers = new AxiosHeaders({ Authorization: 'Bearer token.de.servico' });
  const config: any = { method, url, headers, data: '{"ids":["a"]}' };
  return new AxiosError('Request failed with status code 503', 'ERR_BAD_RESPONSE', config, {},
    { status: 503, data: { detalhe: 'corpo' }, headers: {}, config, statusText: '' } as any);
};

let spy: jest.SpyInstance;
beforeEach(() => {
  registryGet.mockReset();
  registryPost.mockReset();
  spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => spy.mockRestore());

/** Saída como o `console.error` real a formataria. */
const output = () => spy.mock.calls.map(c => format(...c)).join(' | ');

const expectNoSecrets = (url: string) => {
  const out = output();
  expect(out).toContain(url);
  expect(out).not.toContain('Bearer');
  expect(out).not.toContain('token.de.servico');
  expect(out).not.toContain('corpo');
};

describe('integrationService: falhas registradas sem segredos (T07 item 5)', () => {
  it('getCompanyById devolve null', async () => {
    registryGet.mockRejectedValue(axiosError('get', '/company/x'));
    expect(await getCompanyById('x')).toBeNull();
    expectNoSecrets('/company/x');
  });

  it('getCompaniesByIds devolve lista vazia', async () => {
    registryPost.mockRejectedValue(axiosError('post', '/company/lookup'));
    expect(await getCompaniesByIds(['a'])).toEqual([]);
    expectNoSecrets('/company/lookup');
  });

  it('fetchCompaniesStrict lança RegistryUnavailableError', async () => {
    registryPost.mockRejectedValue(axiosError('post', '/company/lookup'));
    await expect(fetchCompaniesStrict(['a'])).rejects.toBeInstanceOf(RegistryUnavailableError);
    expectNoSecrets('/company/lookup');
  });
});
