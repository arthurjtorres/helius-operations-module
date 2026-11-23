import { randomUUID } from 'crypto';
import { Op } from 'sequelize';

const transaction = { commit: jest.fn(), rollback: jest.fn() };
const mocks = { findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), create: jest.fn() };

jest.mock('../database/models', () => ({
  __esModule: true,
  default: { transaction: jest.fn(async () => transaction) },
  VehicleModel: {
    findAll: (...a: unknown[]) => mocks.findAll(...a), findOne: (...a: unknown[]) => mocks.findOne(...a),
    update: (...a: unknown[]) => mocks.update(...a), create: (...a: unknown[]) => mocks.create(...a),
  },
  VehicleTypeModel: {},
}));
jest.mock('../services/integrations/VehicleAggregator', () => ({ enrichVehicleData: jest.fn() }));

import VehicleService from '../services/VehicleService';
import { JwtPayload } from '../middlewares/Authentication';
import { companyScope } from '../utils/AccessPolicy';
import { CameraTypeEnum } from "../database/models/enums/CameraTypeEnum";

const newVehicle = (fkVehicleCompanyId: string) => ({
  vehicleNumber: "ZZ1", fkVehicleCompanyId, brand: "B", licensePlate: "ZZZ1A23", chassisNumber: "C", fabricationYear: "2020",
  modelYear: "2020", renavan: "00000000001", fkTypeVehicleId: randomUUID(), capacity: 40, model: "M", hasWifi: false,
  cameraType: Object.values(CameraTypeEnum)[0], createdBy: randomUUID(),
}) as never;

const service = new VehicleService();
const userId = randomUUID();
const [A, B] = [randomUUID(), randomUUID()];
const scope = [A];
const scoped = { fkVehicleCompanyId: { [Op.in]: scope } };
const whereOf = (m: jest.Mock, call = 0) => m.mock.calls[call][m === mocks.update ? 1 : 0].where;

beforeEach(() => {
  Object.values(mocks).forEach(m => m.mockReset());
  mocks.findAll.mockResolvedValue([]);
  mocks.findOne.mockResolvedValue(null);
  mocks.update.mockResolvedValue([0]);
});

describe('companyScope (T18)', () => {
  const user = (p: Partial<JwtPayload>) => ({ userId, userType: 'COLABORADOR', ...p }) as JwtPayload;
  it('SISTEMA e serviço sem filtro; colaborador usa companyIds; token antigo → []', () => {
    expect(companyScope(user({ userType: 'SISTEMA' }))).toBeNull();
    expect(companyScope(user({ tokenType: 'service' }))).toBeNull();
    expect(companyScope(user({ companyIds: [A] }))).toEqual([A]);
    expect(companyScope(user({}))).toEqual([]);
  });
});

describe('VehicleService com escopo (T18)', () => {
  it('create, PUT com empresa nova e bulk fora do escopo → 403, sem gravar', async () => {
    expect((await service.createVehicle(newVehicle(B), scope)).status).toBe(403);
    expect((await service.updateVehicle(randomUUID(), { fkVehicleCompanyId: B, updatedBy: userId } as never, scope)).status).toBe(403);
    expect((await service.bulkImport({ companyId: B, userId, vehicles: [] }, {}, scope)).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('GET com ?fkVehicleCompanyId fora → 403; sem filtro, restringe ao escopo', async () => {
    expect((await service.findVehicles({ fkVehicleCompanyId: B }, scope)).status).toBe(403);
    await service.findVehicles({}, scope);
    expect(whereOf(mocks.findAll)).toMatchObject(scoped);
  });

  it('by-id, PUT (empresa atual), delete e reactivate fora do escopo → 404', async () => {
    const id = randomUUID();
    expect((await service.getVehicle(id, scope)).status).toBe(404);
    expect((await service.reactivateVehicle(id, userId, scope)).status).toBe(404);
    expect(whereOf(mocks.findOne, 0)).toMatchObject(scoped);
    expect(whereOf(mocks.findOne, 1)).toMatchObject(scoped);
    expect((await service.updateVehicle(id, { brand: "X", updatedBy: userId } as never, scope)).status).toBe(404);
    expect((await service.deleteVehicle(id, userId, scope)).status).toBe(404);
    expect(whereOf(mocks.update, 0)).toMatchObject(scoped);
    expect(whereOf(mocks.update, 1)).toMatchObject(scoped);
  });

  it('lookup e bulk-deactivate filtram pelo escopo (fora = não encontrado, 409)', async () => {
    const id = randomUUID();
    await service.lookupVehicles([id], scope);
    expect(whereOf(mocks.findAll)).toMatchObject(scoped);
    expect((await service.bulkDeactivate([id], userId, scope)).status).toBe(409);
    expect(whereOf(mocks.findAll, 1)).toMatchObject(scoped);
  });

  it('sem escopo (null, serviço ou SISTEMA) não filtra', async () => {
    await service.lookupVehicles([randomUUID()], null);
    expect(whereOf(mocks.findAll).fkVehicleCompanyId).toBeUndefined();
  });
});
