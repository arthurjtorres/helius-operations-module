import BusTimetableModel from "./BusTimetableModel";
import LocationModel from "./LocationModel";
import VehicleModel from "./VehicleModel";
import VehicleTypeModel from "./VehicleTypeModel";

export const setupAssociations = () => {


  VehicleModel.belongsTo(VehicleTypeModel, {
    foreignKey: 'fkTypeVehicleId',
    targetKey: 'typeVehicleId',
    as: 'VehicleType'
  });

  VehicleTypeModel.hasMany(VehicleModel, {
    foreignKey: 'fkTypeVehicleId',
    sourceKey: 'typeVehicleId',
    as: 'Vehicle'
  });

  BusTimetableModel.belongsTo(LocationModel, {
    foreignKey: 'fkBusTimetableLocationStartId',
    targetKey: 'locationId',
    as: 'StartLocation',
  });

  BusTimetableModel.belongsTo(LocationModel, {
    foreignKey: 'fkBusTimetableLocationEndId',
    targetKey: 'locationId',
    as: 'EndLocation',
  });

  LocationModel.hasMany(BusTimetableModel, {
    foreignKey: 'fkBusTimetableLocationStartId',
    sourceKey: 'locationId',
    as: 'StartTimeTable',
  });

  LocationModel.hasMany(BusTimetableModel, {
    foreignKey: 'fkBusTimetableLocationEndId',
    sourceKey: 'locationId',
    as: 'EndTimeTable',
  });

  console.log("✅ Associações configuradas com sucesso.");
};