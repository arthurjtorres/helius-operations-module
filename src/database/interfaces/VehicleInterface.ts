import { CameraTypeEnum } from "../models/enums/CameraTypeEnum";

export default interface VehicleInterface {
  vehicleId?: string;
  vehicleNumber: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: string;
  hasWifi: boolean;
  cameraType: CameraTypeEnum;
  fkVehicleTypeVehicleId: string;
  fkVehicleCompanyId: string;

  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}


