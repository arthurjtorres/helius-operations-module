const transaction = { commit: jest.fn(), rollback: jest.fn() };
const mocks = {
  vehicleFindAll: jest.fn(), vehicleBulkCreate: jest.fn(), vehicleUpdate: jest.fn(),
  activeTypes: jest.fn(), typeNames: jest.fn(), companies: jest.fn(),
};

type Where = { where?: Record<string, unknown> };
jest.mock('../database/models', () => ({
  __esModule: true,
  default: { transaction: jest.fn(async () => transaction) },
  VehicleModel: {
    findAll: (...a: unknown[]) => mocks.vehicleFindAll(...a),
    bulkCreate: (...a: unknown[]) => mocks.vehicleBulkCreate(...a),
    update: (...a: unknown[]) => mocks.vehicleUpdate(...a),
  },
  VehicleTypeModel: { findAll: (o: Where) => ('activated' in (o.where ?? {}) ? mocks.activeTypes(o) : mocks.typeNames(o)) },
}));
jest.mock('../services/integrations/integrationService', () => {
  class RegistryUnavailableError extends Error {}
  return { RegistryUnavailableError, fetchCompaniesStrict: (...a: unknown[]) => mocks.companies(...a) };
});

import VehicleBulkService, { ImportOptions } from '../services/VehicleBulkService';

const companyId = '11111111-1111-4111-8111-111111111111';
const userId = 'u-1';
const item = (n: string, extra: Record<string, unknown> = {}) => ({
  vehicleNumber: n, brand: 'Marca', licensePlate: `ZZT-${n.padStart(4, '0')}`, chassisNumber: `CHASSI${n.padStart(8, '0')}`,
  fabricationYear: '2020', modelYear: '2021', renavan: `1000000${n.padStart(4, '0')}`, typeVehicleName: 'Convencional',
  capacity: 44, model: 'Modelo', hasWifi: 'SIM', cameraType: 'TACOM', ...extra,
});
const stored = (n: string, over: Record<string, unknown> = {}) => ({
  vehicleId: `v-${n}`, vehicleNumber: n, fkVehicleCompanyId: companyId, licensePlate: `ZZT-${n.padStart(4, '0')}`,
  chassisNumber: `CHASSI${n.padStart(8, '0')}`, renavan: `1000000${n.padStart(4, '0')}`, brand: 'Marca', model: 'Modelo',
  fabricationYear: '2020', modelYear: '2021', fkTypeVehicleId: 't-conv', capacity: 44, hasWifi: true, cameraType: 'TACOM', activated: true, ...over,
});

beforeEach(() => {
  Object.values(mocks).forEach(m => m.mockReset());
  transaction.commit.mockReset();
  transaction.rollback.mockReset();
  mocks.companies.mockResolvedValue([{ companyId }]);
  mocks.vehicleFindAll.mockResolvedValue([stored('1')]);
  mocks.vehicleBulkCreate.mockResolvedValue([]);
  mocks.vehicleUpdate.mockResolvedValue([1]);
  mocks.activeTypes.mockResolvedValue([{ typeVehicleId: 't-conv', typeVehicleName: 'Convencional' }, { typeVehicleId: 't-exec', typeVehicleName: 'Executivo' }]);
  mocks.typeNames.mockResolvedValue([{ typeVehicleId: 't-conv', typeVehicleName: 'Convencional' }]);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const run = (vehicles: unknown[], options: ImportOptions = {}) =>
  new VehicleBulkService().importVehicles({ companyId, userId, vehicles }, { mode: 'upsert', ...options });

describe('VehicleBulkService em modo upsert (T10)', () => {
  it('planilha igual: unchanged, nada gravado', async () => {
    const r = await run([item('1')]);
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ mode: 'upsert', unchanged: [{ vehicleId: 'v-1' }], updated: [], skipped: [] });
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('diferença sem confirmação vai para skipped com as mudanças', async () => {
    const r = await run([item('1', { licensePlate: 'ZZT0A01', typeVehicleName: 'Executivo' })]);
    expect(r.status).toBe(200);
    expect(r.data?.skipped[0].changes).toEqual([
      { field: 'licensePlate', current: 'ZZT-0001', new: 'ZZT0A01' },
      { field: 'typeVehicleName', current: 'Convencional', new: 'Executivo' },
    ]);
    expect(mocks.vehicleUpdate).not.toHaveBeenCalled();
  });

  it('confirmada: atualiza com o autor do token na transação', async () => {
    const r = await run([item('1', { licensePlate: 'ZZT0A01', capacity: 40 })], { confirmIds: ['v-1'] });
    expect(r.status).toBe(200);
    expect(r.data?.updated).toHaveLength(1);
    expect(mocks.vehicleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ licensePlate: 'ZZT0A01', capacity: 40, updatedBy: userId }),
      expect.objectContaining({ where: { vehicleId: 'v-1' }, transaction }),
    );
    expect(mocks.vehicleBulkCreate).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalledTimes(1);
  });

  it('dryRun confirmado lista updated sem gravar', async () => {
    const r = await run([item('1', { capacity: 40 })], { confirmIds: ['v-1'], dryRun: true });
    expect(r.data?.updated).toHaveLength(1);
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('placa nova que pertence a outro veículo é conflito', async () => {
    mocks.vehicleFindAll.mockResolvedValue([stored('1'), stored('2')]);
    const r = await run([item('1', { licensePlate: 'ZZT-0002' })], { confirmIds: ['v-1'] });
    expect(r.status).toBe(400);
    expect(r.data?.failed[0]).toMatchObject({ field: 'licensePlate', code: 'CONFLICT' });
  });

  it('número com outro chassi é conflito (outro veículo)', async () => {
    mocks.vehicleFindAll.mockResolvedValue([stored('1', { chassisNumber: 'OUTROCHASSI1' })]);
    const r = await run([item('1')], { confirmIds: ['v-1'] });
    expect(r.status).toBe(400);
    expect(r.data?.failed[0]).toMatchObject({ field: 'chassisNumber', code: 'CONFLICT' });
  });

  it('inativo: conflito sem reactivate; com reactivate e confirmação, reativa', async () => {
    mocks.vehicleFindAll.mockResolvedValue([stored('1', { activated: false })]);
    const sem = await run([item('1')]);
    expect(sem.status).toBe(400);
    expect(sem.data?.failed[0].error).toContain('reactivate=true');
    const com = await run([item('1')], { reactivate: true, confirmIds: ['v-1'] });
    expect(com.status).toBe(200);
    expect(mocks.vehicleUpdate).toHaveBeenCalledWith(expect.objectContaining({ activated: true }), expect.anything());
  });

  it('novo e atualizado no mesmo lote: 201; falha na atualização desfaz tudo', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([stored('1')]).mockResolvedValueOnce([]);
    const ok = await run([item('1', { capacity: 40 }), item('2')], { confirmIds: ['v-1'] });
    expect(ok.status).toBe(201);
    expect(ok.data?.created).toHaveLength(1);
    expect(ok.data?.updated).toHaveLength(1);

    mocks.vehicleFindAll.mockResolvedValueOnce([stored('1')]).mockResolvedValueOnce([]);
    mocks.vehicleUpdate.mockRejectedValue(new Error('falha simulada'));
    const falha = await run([item('1', { capacity: 40 }), item('2')], { confirmIds: ['v-1'] });
    expect(falha.status).toBe(500);
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('insert (padrão) não muda: existente continua skipped', async () => {
    const r = await new VehicleBulkService().importVehicles({ companyId, userId, vehicles: [item('1', { capacity: 40 })] });
    expect(r.data?.skipped).toHaveLength(1);
    expect(r.data?.mode).toBe('insert');
    expect(r.data).not.toHaveProperty('updated');
    expect(mocks.vehicleUpdate).not.toHaveBeenCalled();
  });
});
