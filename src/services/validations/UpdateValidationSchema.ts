import joi from "joi";
import Validation from "./CreateValidationSchema";

const BusTimetableValidation = Validation.BusTimetableValidation.fork(
  Object.keys(Validation.BusTimetableValidation.describe().keys),
  (schema) => schema.optional()
).keys({
  updatedAt: joi.date().required(),
  updatedBy: joi.string().required(),
});

const VehicleTypeValidation = Validation.VehicleTypeValidation.fork(
  Object.keys(Validation.VehicleTypeValidation.describe().keys),
  (schema) => schema.optional()
).keys({
  updatedAt: joi.date().required(),
  updatedBy: joi.string().required(),
});

const VehicleValidation = Validation.VehicleValidation.fork(
  Object.keys(Validation.VehicleValidation.describe().keys),
  (schema) => schema.optional()
).keys({
  updatedAt: joi.date().required(),
  updatedBy: joi.string().required(),
});

const LocationValidation = Validation.LocationValidation.fork(
  Object.keys(Validation.LocationValidation.describe().keys),
  (schema) => schema.optional()
).keys({
  updatedAt: joi.date().required(),
  updatedBy: joi.string().required(),
});

export = {
  BusTimetableValidation,
  VehicleTypeValidation,
  VehicleValidation,
  LocationValidation,
}