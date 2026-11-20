import { randomUUID } from 'crypto';

const transaction = { commit: jest.fn(), rollback: jest.fn() };
const mocks = { findAll: jest.fn(), update: jest.fn() };

jest.mock('../database/models', () => ({
  __esModule: true,
  default: { transaction: jest.fn(async () => transaction) },
  VehicleModel: { findAll: (...a: unknown[]) => mocks.findAll(...a), update: (...a: unknown[]) => mocks.update(...a) },
  VehicleTypeModel: {},
}));
jest.mock('../services/integrations/VehicleAggregator', () => ({ enrichVehicleData: jest.fn() }));

import VehicleService, { MAX_DEACTIVATE_IDS } from '../services/VehicleService';

const service = new VehicleService();
const userId = randomUUID();

describe('VehicleService.bulkDeactivate', () => {
  beforeEach(() => {
    Object.values(mocks).forEach(m => m.mockReset());
    transaction.commit.mockReset();
    transaction.rollback.mockReset();
  });

  it('desativa todos numa transação e devolve a quantidade', async () => {
    const ids = [randomUUID(), randomUUID()];
    mocks.findAll.mockResolvedValue(ids.map(vehicleId => ({ vehicleId })));
    mocks.update.mockResolvedValue([2]);
    const r = await service.bulkDeactivate(ids, userId);
    expect(r.status).toBe(200);
    expect((r as { data?: unknown }).data).toEqual({ deactivated: 2 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ activated: false, updatedBy: userId }), expect.objectContaining({ transaction }));
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('id inexistente ou inativo cancela o lote inteiro e é listado (409)', async () => {
    const [ok, missing] = [randomUUID(), randomUUID()];
    mocks.findAll.mockResolvedValue([{ vehicleId: ok }]);
    const r = await service.bulkDeactivate([ok, missing], userId);
    expect(r.status).toBe(409);
    expect((r as { data?: unknown }).data).toEqual({ ids: [missing] });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it('400 para lista vazia, id inválido ou acima do limite, sem abrir transação', async () => {
    expect((await service.bulkDeactivate([], userId)).status).toBe(400);
    expect((await service.bulkDeactivate(['abc'], userId)).status).toBe(400);
    expect((await service.bulkDeactivate(Array.from({ length: MAX_DEACTIVATE_IDS + 1 }, () => randomUUID()), userId)).status).toBe(400);
    expect(mocks.findAll).not.toHaveBeenCalled();
  });

  it('aceita até 5000 ids (acima do limite de 500 do /lookup)', async () => {
    const ids = Array.from({ length: MAX_DEACTIVATE_IDS }, () => randomUUID());
    mocks.findAll.mockResolvedValue(ids.map(vehicleId => ({ vehicleId })));
    mocks.update.mockResolvedValue([ids.length]);
    expect((await service.bulkDeactivate(ids, userId)).status).toBe(200);
  });

  it('erro no banco desfaz a transação e propaga', async () => {
    const id = randomUUID();
    mocks.findAll.mockResolvedValue([{ vehicleId: id }]);
    mocks.update.mockRejectedValue(new Error('db'));
    await expect(service.bulkDeactivate([id], userId)).rejects.toThrow('db');
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});
