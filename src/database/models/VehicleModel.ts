// VehicleModel

import { DataTypes, Model } from "sequelize";
import { CameraTypeEnum } from "./enums/CameraTypeEnum";
import sequelize from "sequelize";
import db from "./database";

class VehicleModel extends Model {
  declare vehicleId: string;
  declare vehicleName: string;
  declare licensePlate: string;
  declare brand: string;
  declare model: string;
  declare year: string;
  declare hasWifi: boolean;
  declare cameraType: CameraTypeEnum;
  declare fkVehicleTypeVehicleId: string;
  declare fkVehicleCompanyId: string;

  declare createdAt: Date;
  declare createdBy: string;
  declare updatedAt: Date;
  declare updatedBy: string;
  declare activated: boolean;
}

VehicleModel.init({
  vehicleId: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
  },
  vehicleName: {
    type: sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  licensePlate: {
    type: sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  brand: {
    type: sequelize.STRING,
    allowNull: false,
  },
  model: {
    type: sequelize.STRING,
    allowNull: false,
  },
  year: {
    type: sequelize.STRING,
    allowNull: false,
  },
  hasWifi: {
    type: sequelize.BOOLEAN,
    allowNull: false,
  },
  cameraType: {
    type: sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [[...Object.values(CameraTypeEnum)]],
    }
  },
  fkVehicleTypeVehicleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'type_vehicle',
      key: 'type_vehicle_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  fkVehicleCompanyId: {
    type: DataTypes.UUID,
    allowNull: false,
   
  },

  createdAt: {
    allowNull: false,
    type: sequelize.DATE,
    defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
  },
  createdBy: {
    allowNull: false,
    type: DataTypes.UUID,

  },
  updatedAt: {
    allowNull: true,
    type: sequelize.DATE,
    defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
  },
  updatedBy: {
    allowNull: true,
    type: DataTypes.UUID,

  },
  activated: {
    allowNull: false,
    type: sequelize.BOOLEAN,
    defaultValue: true,
  },
}, {
  sequelize: db,
  tableName: 'vehicle',
  schema: 'registry',
  timestamps: false,
  underscored: true
});

export default VehicleModel;