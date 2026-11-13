import { buildCorsOptions, resolveAllowedOrigins } from '../utils/corsOptions';

/** Executa o callback `origin` do cors e devolve [erro, permitido]. */
const check = (allowed: string[], origin: string | undefined) => {
  const opts = buildCorsOptions(allowed);
  let result: [unknown, unknown] = [undefined, undefined];
  (opts.origin as Function)(origin, (err: unknown, ok: unknown) => { result = [err, ok]; });
  return result;
};

describe('resolveAllowedOrigins', () => {
  it('usa CORS_ORIGINS com trim, sem barra final e sem duplicatas', () => {
    expect(resolveAllowedOrigins({ CORS_ORIGINS: ' http://10.0.0.5:1100/ , http://portal:1100,http://portal:1100', PORT_WEB_APP: '9' }))
      .toEqual(['http://10.0.0.5:1100', 'http://portal:1100']);
  });

  it('fallback com DB_HOST e localhost quando CORS_ORIGINS está vazia', () => {
    expect(resolveAllowedOrigins({ CORS_ORIGINS: ' ', DB_HOST: '10.0.0.5', PORT_WEB_APP: '1100' }))
      .toEqual(['http://10.0.0.5:1100', 'http://localhost:1100']);
  });

  it('fallback sem DB_HOST: só localhost', () => {
    expect(resolveAllowedOrigins({ PORT_WEB_APP: '1100' })).toEqual(['http://localhost:1100']);
  });

  it('sem CORS_ORIGINS nem PORT_WEB_APP: lista vazia', () => {
    expect(resolveAllowedOrigins({ DB_HOST: '10.0.0.5' })).toEqual([]);
  });
});

describe('buildCorsOptions', () => {
  const allowed = ['http://10.0.0.5:1100', 'http://localhost:1100'];

  it('origem exata aceita', () => {
    expect(check(allowed, 'http://10.0.0.5:1100')).toEqual([null, true]);
    expect(check(allowed, 'http://localhost:1100')).toEqual([null, true]);
  });

  it('origens parecidas ou fora da lista recusadas sem erro', () => {
    expect(check(allowed, 'http://localhost.evil.com')).toEqual([null, false]);
    expect(check(allowed, 'http://192.168.0.99:1100')).toEqual([null, false]);
    expect(check(allowed, 'http://10.10.0.1:1100')).toEqual([null, false]);
    expect(check(allowed, 'http://localhost:1100.evil.com')).toEqual([null, false]);
  });

  it('sem Origin aceito (chamada entre módulos, Postman)', () => {
    expect(check(allowed, undefined)).toEqual([null, true]);
  });

  it('mantém métodos, cabeçalhos e credentials', () => {
    const opts = buildCorsOptions(allowed);
    expect(opts.credentials).toBe(true);
    expect(opts.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    expect(opts.allowedHeaders).toContain('Authorization');
  });
});
