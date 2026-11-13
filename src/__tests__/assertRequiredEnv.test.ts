import { assertRequiredEnv, missingEnv, REQUIRED_ENV } from '../utils/assertRequiredEnv';

const fullEnv = (): NodeJS.ProcessEnv =>
  Object.fromEntries([...REQUIRED_ENV, 'PORT_WEB_APP'].map(n => [n, `valor-de-${n}`]));

describe('assertRequiredEnv', () => {
  let exit: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { exit.mockRestore(); error.mockRestore(); });

  it('tudo presente: não encerra nem registra', () => {
    assertRequiredEnv(REQUIRED_ENV, fullEnv());
    expect(exit).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('variável ausente: lista o nome (não o valor) e encerra com 1', () => {
    const env = fullEnv();
    delete env.DB_PASS;
    env.JWT_SECRET = '   ';
    assertRequiredEnv(REQUIRED_ENV, env);
    expect(exit).toHaveBeenCalledWith(1);
    const out = error.mock.calls.flat().join(' ');
    expect(out).toContain('DB_PASS');
    expect(out).toContain('JWT_SECRET');
    expect(out).not.toContain('valor-de-');
  });

  it('exige CORS_ORIGINS ou PORT_WEB_APP', () => {
    const env = fullEnv();
    delete env.PORT_WEB_APP;
    expect(missingEnv(REQUIRED_ENV, env)).toEqual(['CORS_ORIGINS|PORT_WEB_APP']);
    expect(missingEnv(REQUIRED_ENV, { ...env, CORS_ORIGINS: 'http://portal:1100' })).toEqual([]);
  });
});
