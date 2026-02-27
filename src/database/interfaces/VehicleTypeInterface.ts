export default interface VehicleTypeInterface {
  typeVehicleId?: string;
  typeVehicleName: string;
  airConditioner: boolean;

  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

