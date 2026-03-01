import { CameraTypeEnum } from "../models/enums/CameraTypeEnum";

export default interface VehicleInterface {
  vehicleId?: string;
  vehicleNumber: string;
  fkVehicleCompanyId?: string;
  brand?: string;
  licensePlate?: string;
  chassisNumber?: string;
  fabricationYear?: string;
  modelYear?: string;
  renavan?: string;
  fkVehicleTypeVehicleId?: string;
  capacity?: number;
  model?: string;
  hasWifi?: boolean;
  cameraType?: CameraTypeEnum;

  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}


