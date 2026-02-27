import db from "./database";
import { setupAssociations } from "./associations";

import BusTimetableModel from "./BusTimetableModel";
import LocationModel from "./LocationModel";
import VehicleModel from "./VehicleModel";
import VehicleTypeModel from "./VehicleTypeModel";

setupAssociations();

export default db;

export {
  BusTimetableModel,
  LocationModel,
  VehicleModel,
  VehicleTypeModel,
}