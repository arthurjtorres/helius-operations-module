import { normalizeText, parseBoolean, plateKey, plateVariants, validateVehicleItems } from '../utils/VehicleImport';

const item = (p: Record<string, unknown> = {}) => ({
  vehicleNumber: '1001', brand: 'ZZ_TEST_Marca', licensePlate: 'ABC-1234', chassisNumber: '9BWZZZ377VT004251',
  fabricationYear: '2020', modelYear: '2021', renavan: '12345678901', typeVehicleName: 'Convencional',
  capacity: 44, model: 'ZZ_TEST_Modelo', hasWifi: 'SIM', cameraType: 'tacom', ...p,
});

describe('texto e placa', () => {
  it('normalizeText remove acento, caixa e espaços repetidos', () => expect(normalizeText(' Ônibus   Urbano ')).toBe('ONIBUS URBANO'));
  it('plateKey ignora hífen e caixa; plateVariants gera as duas gravações', () => {
    expect(plateKey('abc-1234')).toBe('ABC1234');
    expect(plateKey('ABC1D23')).toBe('ABC1D23');
    expect(plateVariants('ABC1234')).toEqual(['ABC1234', 'ABC-1234']);
  });
  it('parseBoolean entende sim/não e equivalentes', () => {
    ['SIM', 'sim', 'S', true, 1, 'true', '1'].forEach(v => expect(parseBoolean(v)).toBe(true));
    ['NÃO', 'nao', 'N', false, 0, 'false', '0'].forEach(v => expect(parseBoolean(v)).toBe(false));
    ['talvez', '', null, undefined, 2, {}].forEach(v => expect(parseBoolean(v)).toBeNull());
  });
});

describe('validateVehicleItems', () => {
  it('item correto vira válido com campos normalizados', () => {
    const { valid, failed } = validateVehicleItems([item()]);
    expect(failed).toEqual([]);
    expect(valid[0]).toMatchObject({
      line: 1, vehicleNumber: '1001', licensePlate: 'ABC-1234', plateKey: 'ABC1234', renavan: '12345678901',
      typeKey: 'CONVENCIONAL', capacity: 44, hasWifi: true, cameraType: 'TACOM',
    });
  });
  it('aceita valores vindos de planilha: números e textos', () => {
    const { valid, failed } = validateVehicleItems([item({ vehicleNumber: 1001, renavan: 12345678901, capacity: '44', fabricationYear: 2020, modelYear: 2020, hasWifi: 'não', licensePlate: 'abc1d23', renavan2: 1 })]);
    expect(failed).toEqual([]);
    expect(valid[0]).toMatchObject({ vehicleNumber: '1001', capacity: 44, hasWifi: false, licensePlate: 'ABC1D23' });
  });
  it('relata cada problema com linha, campo e número do veículo', () => {
    const { valid, failed } = validateVehicleItems([
      item({ vehicleNumber: '2002', licensePlate: 'XX', chassisNumber: 'ab', renavan: '12', fabricationYear: '1800', modelYear: 'x',
        capacity: 0, hasWifi: 'talvez', cameraType: 'OUTRA', brand: '', model: undefined, typeVehicleName: '' }),
    ]);
    expect(valid).toEqual([]);
    expect(failed.map(f => f.field).sort()).toEqual(['brand', 'cameraType', 'capacity', 'chassisNumber', 'fabricationYear', 'hasWifi', 'licensePlate', 'model', 'modelYear', 'renavan', 'typeVehicleName']);
    expect(failed.every(f => f.line === 1 && f.vehicleNumber === '2002' && f.code === 'INVALID')).toBe(true);
  });
  it('ano do modelo anterior ao de fabricação é erro', () => {
    const { failed } = validateVehicleItems([item({ fabricationYear: '2021', modelYear: '2020' })]);
    expect(failed.map(f => f.field)).toEqual(['modelYear']);
  });
  it('repetidos no arquivo (número, placa com ou sem hífen, chassi, renavam) apontam a primeira linha', () => {
    const { valid, failed } = validateVehicleItems([item(), item({ licensePlate: 'abc1234' })]);
    expect(valid).toHaveLength(1);
    expect(failed.filter(f => f.line === 2).map(f => f.field).sort()).toEqual(['chassisNumber', 'licensePlate', 'renavan', 'vehicleNumber']);
    expect(failed.find(f => f.field === 'licensePlate')?.error).toContain('linha 1');
  });
  it('itens que não são objeto ou com tipos errados não quebram', () => {
    const { valid, failed } = validateVehicleItems([null, 'x', 7, item({ brand: ['a'], capacity: {} })]);
    expect(valid).toEqual([]);
    expect(new Set(failed.map(f => f.line))).toEqual(new Set([1, 2, 3, 4]));
  });
  it('texto acima de 255 caracteres é rejeitado', () => {
    const longo = 'x'.repeat(256);
    const { failed } = validateVehicleItems([item({ brand: longo, model: longo, typeVehicleName: longo })]);
    expect(failed.map(f => f.field).sort()).toEqual(['brand', 'model', 'typeVehicleName']);
  });
});
