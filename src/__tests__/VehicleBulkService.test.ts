import { randomUUID } from 'crypto';

const transaction = { commit: jest.fn(), rollback: jest.fn() };
const mocks = { vehicleFindAll: jest.fn(), vehicleBulkCreate: jest.fn(), typeFindAll: jest.fn(), companies: jest.fn() };

jest.mock('../database/models', () => ({
  __esModule: true,
  default: { transaction: jest.fn(async () => transaction) },
  VehicleModel: { findAll: (...a: unknown[]) => mocks.vehicleFindAll(...a), bulkCreate: (...a: unknown[]) => mocks.vehicleBulkCreate(...a) },
  VehicleTypeModel: { findAll: (...a: unknown[]) => mocks.typeFindAll(...a) },
}));
jest.mock('../services/integrations/integrationService', () => {
  class RegistryUnavailableError extends Error {}
  return { RegistryUnavailableError, fetchCompaniesStrict: (...a: unknown[]) => mocks.companies(...a) };
});

import VehicleBulkService from '../services/VehicleBulkService';
import { RegistryUnavailableError } from '../services/integrations/integrationService';

const companyId = randomUUID();
const userId = randomUUID();
const typeId = randomUUID();
const item = (n: string, extra: Record<string, unknown> = {}) => ({
  vehicleNumber: n, brand: 'ZZ_TEST_Marca', licensePlate: `ZZT-${n.padStart(4, '0')}`, chassisNumber: `CHASSI${n.padStart(8, '0')}`,
  fabricationYear: '2020', modelYear: '2021', renavan: `1000000${n.padStart(4, '0')}`, typeVehicleName: 'Convencional',
  capacity: 44, model: 'ZZ_TEST_Modelo', hasWifi: 'SIM', cameraType: 'TACOM', ...extra,
});

beforeEach(() => {
  Object.values(mocks).forEach(m => m.mockReset());
  transaction.commit.mockReset();
  transaction.rollback.mockReset();
  mocks.companies.mockResolvedValue([{ companyId }]);
  mocks.vehicleFindAll.mockResolvedValue([]);
  mocks.vehicleBulkCreate.mockResolvedValue([]);
  mocks.typeFindAll.mockResolvedValue([{ typeVehicleId: typeId, typeVehicleName: 'Convencional' }]);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const run = (vehicles: unknown, dryRun = false) => new VehicleBulkService().importVehicles({ companyId, userId, vehicles }, { dryRun });

describe('VehicleBulkService (tudo ou nada)', () => {
  it('grava os veículos numa transação, com a empresa da requisição e o autor do token', async () => {
    const r = await run([item('1'), item('2')]);
    expect(r.status).toBe(201);
    expect(r.data?.created).toHaveLength(2);
    expect(transaction.commit).toHaveBeenCalledTimes(1);
    const rows = mocks.vehicleBulkCreate.mock.calls[0][0];
    expect(rows[0]).toMatchObject({ fkVehicleCompanyId: companyId, fkTypeVehicleId: typeId, createdBy: userId, updatedBy: userId, activated: true, hasWifi: true, cameraType: 'TACOM' });
  });

  it('falha ao gravar desfaz tudo (rollback) e responde 500 sem confirmar', async () => {
    mocks.vehicleBulkCreate.mockRejectedValue(new Error('falha simulada'));
    const r = await run([item('1')]);
    expect(r.status).toBe(500);
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('violação de unicidade na gravação → 409 com rollback', async () => {
    const { UniqueConstraintError } = jest.requireActual('sequelize');
    mocks.vehicleBulkCreate.mockRejectedValue(new UniqueConstraintError({}));
    expect((await run([item('1')])).status).toBe(409);
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('um item inválido rejeita o lote inteiro sem gravar', async () => {
    const r = await run([item('1'), item('2', { capacity: 0 })]);
    expect(r.status).toBe(400);
    expect(r.data?.failed[0]).toMatchObject({ line: 2, field: 'capacity', vehicleNumber: '2' });
    expect(mocks.vehicleBulkCreate).not.toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('tipo inexistente rejeita e lista os tipos faltantes sem repetição; tipo ambíguo também', async () => {
    let r = await run([item('1', { typeVehicleName: 'Articulado' }), item('2', { typeVehicleName: 'Articulado' })]);
    expect(r.status).toBe(400);
    expect(r.data?.missingVehicleTypes).toEqual(['Articulado']);
    mocks.typeFindAll.mockResolvedValue([{ typeVehicleId: randomUUID(), typeVehicleName: 'Convencional' }, { typeVehicleId: randomUUID(), typeVehicleName: 'CONVENCIONAL' }]);
    r = await run([item('1')]);
    expect(r.data?.failed[0].error).toContain('ambíguo');
  });

  it('tipo é comparado sem acento nem caixa', async () => {
    mocks.typeFindAll.mockResolvedValue([{ typeVehicleId: typeId, typeVehicleName: 'Ônibus Urbano' }]);
    expect((await run([item('1', { typeVehicleName: 'onibus urbano' })])).status).toBe(201);
  });

  it('veículo ativo já cadastrado (número e placa do mesmo veículo) é ignorado; só os novos entram', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([{ vehicleId: 'v-1', vehicleNumber: '1', licensePlate: 'ZZT-0001', activated: true }]).mockResolvedValue([]);
    const r = await run([item('1'), item('2')]);
    expect(r.status).toBe(201);
    expect(r.data?.skipped).toEqual([expect.objectContaining({ line: 1, vehicleNumber: '1', vehicleId: 'v-1' })]);
    expect(r.data?.created).toHaveLength(1);
  });

  it('todos já cadastrados → 200 sem gravar', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([{ vehicleId: 'v-1', vehicleNumber: '1', licensePlate: 'ZZT-0001', activated: true }]);
    const r = await run([item('1')]);
    expect(r.status).toBe(200);
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('veículo inativo vira conflito com a rota de reativação', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([{ vehicleId: 'v-9', vehicleNumber: '1', licensePlate: 'ZZT-0001', activated: false }]);
    const r = await run([item('1')]);
    expect(r.status).toBe(400);
    expect(r.data?.failed[0]).toMatchObject({ code: 'CONFLICT' });
    expect(r.data?.failed[0].error).toContain('/vehicle/v-9/reactivate');
  });

  it('número de um veículo e placa de outro (ou só um deles) são conflitos', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([
      { vehicleId: 'a', vehicleNumber: '1', licensePlate: 'OUT-0001', activated: true },
      { vehicleId: 'b', vehicleNumber: '77', licensePlate: 'ZZT-0001', activated: true },
    ]);
    const r = await run([item('1')]);
    expect(r.status).toBe(400);
    expect(r.data?.failed[0].error).toContain('diferentes');
    mocks.vehicleFindAll.mockResolvedValueOnce([{ vehicleId: 'a', vehicleNumber: '1', licensePlate: 'OUT-0001', activated: true }]);
    expect((await run([item('1')])).data?.failed[0].error).toContain('outra placa');
  });

  it('placa já cadastrada com outro formato (com ou sem hífen) é reconhecida', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([{ vehicleId: 'v-1', vehicleNumber: '1', licensePlate: 'ZZT0001', activated: true }]);
    const r = await run([item('1', { licensePlate: 'ZZT-0001' })]);
    expect(r.data?.skipped).toHaveLength(1);
  });

  it('chassi ou renavam já usados por outro veículo são erro por item', async () => {
    mocks.vehicleFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ vehicleId: 'x', chassisNumber: 'CHASSI00000001', renavan: '10000000001' }]);
    const r = await run([item('1')]);
    expect(r.status).toBe(400);
    expect(r.data?.failed.map(f => f.field).sort()).toEqual(['chassisNumber', 'renavan']);
  });

  it('dryRun valida e relata sem gravar nem abrir transação', async () => {
    const r = await run([item('1')], true);
    expect(r.status).toBe(200);
    expect(r.data?.dryRun).toBe(true);
    expect(r.data?.created).toHaveLength(1);
    expect(mocks.vehicleBulkCreate).not.toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('empresa: inexistente → 400; registry fora do ar → 503 (não confunde os dois)', async () => {
    mocks.companies.mockResolvedValue([]);
    expect((await run([item('1')])).status).toBe(400);
    mocks.companies.mockRejectedValue(new RegistryUnavailableError('timeout'));
    expect((await run([item('1')])).status).toBe(503);
    expect(mocks.vehicleBulkCreate).not.toHaveBeenCalled();
  });

  it('validações de entrada: lista vazia, acima do limite, empresa inválida, sem usuário', async () => {
    expect((await run([])).status).toBe(400);
    expect((await run(undefined)).status).toBe(400);
    expect((await run(Array.from({ length: 501 }, (_, i) => item(String(i))))).status).toBe(400);
    expect((await new VehicleBulkService().importVehicles({ companyId: 'x', userId, vehicles: [item('1')] })).status).toBe(400);
    expect((await new VehicleBulkService().importVehicles({ companyId, vehicles: [item('1')] })).status).toBe(401);
  });
});
