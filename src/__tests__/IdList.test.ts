import { randomUUID } from 'crypto';
import { MAX_LOOKUP_IDS, parseIdList } from '../utils/IdList';

describe('parseIdList (consulta em lote)', () => {
  it('aceita UUIDs e remove repetidos', () => {
    const a = randomUUID();
    const b = randomUUID();
    expect(parseIdList([a, b, a])).toEqual({ ids: [a, b] });
  });
  it('lista ausente, vazia ou de outro tipo → "não informada"', () => {
    const esperado = { error: 'Lista de IDs não informada.' };
    expect(parseIdList(undefined)).toEqual(esperado);
    expect(parseIdList([])).toEqual(esperado);
    expect(parseIdList('abc')).toEqual(esperado);
    expect(parseIdList({ ids: [] })).toEqual(esperado);
  });
  it('ID que não é UUID → inválido (evita erro 500 do banco)', () => {
    expect(parseIdList([randomUUID(), '1'])).toEqual({ error: 'A lista contém ID inválido.' });
    expect(parseIdList([123])).toEqual({ error: 'A lista contém ID inválido.' });
  });
  it(`mais de ${MAX_LOOKUP_IDS} IDs distintos → limite`, () => {
    const ids = Array.from({ length: MAX_LOOKUP_IDS + 1 }, () => randomUUID());
    expect(parseIdList(ids)).toEqual({ error: `Máximo de ${MAX_LOOKUP_IDS} IDs por consulta.` });
    expect('ids' in parseIdList(ids.slice(0, MAX_LOOKUP_IDS))).toBe(true);
  });
});
