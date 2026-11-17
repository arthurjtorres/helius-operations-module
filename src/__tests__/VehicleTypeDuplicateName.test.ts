const mocks = { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), findOne: jest.fn() };

jest.mock('../database/models', () => ({
  __esModule: true,
  VehicleTypeModel: {
    findAll: (...a: unknown[]) => mocks.findAll(...a),
    create: (...a: unknown[]) => mocks.create(...a),
    update: (...a: unknown[]) => mocks.update(...a),
    findOne: (...a: unknown[]) => mocks.findOne(...a),
  },
  VehicleModel: {},
}));

import VehicleTypeService from '../services/VehicleTypeService';

const service = new VehicleTypeService();
const base = { typeVehicleName: 'ZZ_TEST_Convencional', airConditioner: false, createdBy: 'u-1' } as never;
const stored = (typeVehicleId: string, typeVehicleName: string, activated = true) => ({ typeVehicleId, typeVehicleName, activated });

describe('VehicleTypeService: nome duplicado', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cria quando o nome está livre', async () => {
    mocks.findAll.mockResolvedValue([stored('t-1', 'ZZ_TEST_Articulado')]);
    const r = await service.createVehicleType({ ...(base as object) } as never);
    expect(r.status).toBe(201);
    expect(mocks.create).toHaveBeenCalled();
  });

  it('bloqueia nome igual a um ativo, ignorando acento, caixa e espaços', async () => {
    mocks.findAll.mockResolvedValue([stored('t-1', '  zz_test_CONVENCIONAL ')]);
    const r = await service.createVehicleType({ ...(base as object) } as never);
    expect(r.status).toBe(409);
    expect('data' in r).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('nome igual a um inativo devolve o id para reativação', async () => {
    mocks.findAll.mockResolvedValue([stored('t-9', 'ZZ_TEST_Convencional', false)]);
    const r = await service.createVehicleType({ ...(base as object) } as never);
    expect(r).toEqual(expect.objectContaining({ status: 409, data: { id: 't-9' } }));
  });

  it('no PUT ignora o próprio registro e bloqueia o nome de outro', async () => {
    mocks.findAll.mockResolvedValue([stored('t-1', 'ZZ_TEST_Convencional'), stored('t-2', 'ZZ_TEST_Micro')]);
    mocks.update.mockResolvedValue([1]);
    const own = await service.updateVehicleType('t-1', { typeVehicleName: 'ZZ_TEST_Convencional', updatedBy: 'u-1' } as never);
    expect(own.status).toBe(200);
    const other = await service.updateVehicleType('t-1', { typeVehicleName: 'ZZ_TEST_Micro', updatedBy: 'u-1' } as never);
    expect(other.status).toBe(409);
  });

  it('PUT sem nome não consulta duplicidade', async () => {
    mocks.update.mockResolvedValue([1]);
    await service.updateVehicleType('t-1', { airConditioner: true, updatedBy: 'u-1' } as never);
    expect(mocks.findAll).not.toHaveBeenCalled();
  });
});
