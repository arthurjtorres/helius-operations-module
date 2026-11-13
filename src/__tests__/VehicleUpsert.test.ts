import { validateVehicleItems } from '../utils/VehicleImport';
import { compareVehicle, ComparisonInput, ComparisonResult, CurrentVehicle, isConflict, parseImportOptions } from '../utils/VehicleUpsert';

const companyId = 'c-1';

const validItem = (p: Record<string, unknown> = {}) => validateVehicleItems([{
  vehicleNumber: '1001', brand: 'Marca', licensePlate: 'ABC-1234', chassisNumber: '9BWZZZ377VT004251',
  fabricationYear: '2020', modelYear: '2021', renavan: '12345678901', typeVehicleName: 'Convencional',
  capacity: 44, model: 'Modelo', hasWifi: 'SIM', cameraType: 'TACOM', ...p,
}]).valid[0];

const stored = (over: Partial<CurrentVehicle> = {}): CurrentVehicle => ({
  vehicleId: 'v-1', vehicleNumber: '1001', fkVehicleCompanyId: companyId, licensePlate: 'ABC-1234',
  chassisNumber: '9BWZZZ377VT004251', renavan: '12345678901', brand: 'Marca', model: 'Modelo',
  fabricationYear: '2020', modelYear: '2021', fkTypeVehicleId: 't-conv', capacity: 44, hasWifi: true,
  cameraType: 'TACOM', activated: true, ...over,
});

const input = (vehicle: Partial<CurrentVehicle> = {}, item: Record<string, unknown> = {}, typeVehicleId = 't-conv'): ComparisonInput => ({
  item: validItem(item), typeVehicleId, companyId, vehicle: stored(vehicle), currentTypeName: 'Convencional',
});

const result = (i: ComparisonInput) => {
  const r = compareVehicle(i);
  if (isConflict(r)) throw new Error(`conflito inesperado: ${r.conflict.error}`);
  return r as ComparisonResult;
};

describe('compareVehicle', () => {
  it('planilha igual: nenhuma diferença; placa só sem hífen e marca em maiúsculas também contam como iguais', () => {
    expect(result(input()).changes).toEqual([]);
    expect(result(input({}, { licensePlate: 'ABC1234', brand: 'MARCA', model: 'modelo' })).changes).toEqual([]);
  });

  it('conversão Mercosul da placa é mudança', () => {
    const r = result(input({}, { licensePlate: 'ABC1C34' }));
    expect(r.changes).toEqual([{ field: 'licensePlate', current: 'ABC-1234', new: 'ABC1C34' }]);
    expect(r.patch).toEqual({ licensePlate: 'ABC1C34' });
  });

  it('relata os campos atualizáveis com valor atual e novo', () => {
    const r = result(input({}, {
      brand: 'Outra', model: 'Novo', fabricationYear: '2021', modelYear: '2022', typeVehicleName: 'Executivo',
      capacity: 40, hasWifi: 'NÃO', cameraType: 'ENGIS',
    }, 't-exec'));
    expect(r.changes.map(c => c.field)).toEqual(['brand', 'model', 'fabricationYear', 'modelYear', 'typeVehicleName', 'capacity', 'hasWifi', 'cameraType']);
    expect(r.changes.find(c => c.field === 'typeVehicleName')).toEqual({ field: 'typeVehicleName', current: 'Convencional', new: 'Executivo' });
    expect(r.patch).toMatchObject({ fkTypeVehicleId: 't-exec', capacity: 40, hasWifi: false, cameraType: 'ENGIS' });
  });

  it('inativo vira mudança de "activated"', () => {
    expect(result(input({ activated: false })).changes).toEqual([{ field: 'activated', current: false, new: true }]);
  });

  it('identidade divergente é conflito: chassi, renavam ou empresa', () => {
    expect(compareVehicle(input({ chassisNumber: '9BWZZZ377VT999999' }))).toEqual({ conflict: expect.objectContaining({ field: 'chassisNumber' }) });
    expect(compareVehicle(input({ renavan: '99999999999' }))).toEqual({ conflict: expect.objectContaining({ field: 'renavan' }) });
    expect(compareVehicle(input({ fkVehicleCompanyId: 'c-2' }))).toEqual({ conflict: expect.objectContaining({ field: 'companyId' }) });
  });
});

describe('parseImportOptions', () => {
  it('padrão insert; lê upsert, reactivate, dryRun e confirmIds', () => {
    expect(parseImportOptions({}, {})).toEqual({ options: { dryRun: false, mode: 'insert', reactivate: false, confirmIds: [] } });
    expect(parseImportOptions({ mode: 'upsert', reactivate: 'true', dryRun: 'true' }, { confirmIds: ['v-1'] }))
      .toEqual({ options: { dryRun: true, mode: 'upsert', reactivate: true, confirmIds: ['v-1'] } });
  });
  it('rejeita mode desconhecido, confirmIds inválido e opções de upsert em insert', () => {
    expect(parseImportOptions({ mode: 'x' }, {})).toHaveProperty('error');
    expect(parseImportOptions({ mode: 'upsert' }, { confirmIds: [1] })).toHaveProperty('error');
    expect(parseImportOptions({}, { confirmIds: ['v-1'] })).toHaveProperty('error');
    expect(parseImportOptions({ reactivate: 'true' }, {})).toHaveProperty('error');
  });
});
