import joi from "joi";
import { CameraTypeEnum } from "../../database/models/enums/CameraTypeEnum";
import { LocationTypeEnum } from "../../database/models/enums/LocationTypeEnum";

const BusTimetableValidation = joi.object({
  timetableName: joi.string().required(),
  timetableCode: joi.string().required(),
  kml: joi.string().optional().allow(null, ""),
  startDate: joi.date().optional(),
  endDate: joi.date().optional(),
  fkBusTimetableLocationStartId: joi.string().uuid().required(),
  fkBusTimetableLocationEndId: joi.string().uuid().required(),

  createdAt: joi.date().required(),
  createdBy: joi.string().required(),
}); 

const VehicleTypeValidation = joi.object({
  typeVehicleName: joi.string().required(),
  airConditioner: joi.boolean().required(),

  createdAt: joi.date().required(),
  createdBy: joi.string().required(),
});

const VehicleValidation = joi.object({
  vehicleNumber: joi.string().required(),
  licensePlate: joi.string().required(),
  brand: joi.string().required(),
  model: joi.string().required(),
  year: joi.string().required(),
  hasWifi: joi.boolean().required(),
  cameraType: joi.string().valid(...Object.values(CameraTypeEnum)).required(),
  fkVehicleTypeVehicleId: joi.string().uuid().required(),
  fkVehicleCompanyId: joi.string().uuid().required(),

  createdAt: joi.date().required(),
  createdBy: joi.string().required(),
});

const LocationValidation = joi.object({
  locationName: joi.string().required(),
  locationCeturbCode: joi.string().required(),
  locationGlobusCode: joi.string().optional().allow(null, ""),
  locationType: joi.string().valid(...Object.values(LocationTypeEnum)).required(),
  locationAcronym: joi.string().optional().allow(null, ""),

  createdAt: joi.date().required(),
  createdBy: joi.string().required(),
});

export = {
  BusTimetableValidation,
  VehicleTypeValidation,
  VehicleValidation,
  LocationValidation,
}