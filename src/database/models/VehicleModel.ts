// VehicleModel

import { DataTypes, Model } from "sequelize";
import { CameraTypeEnum } from "./enums/CameraTypeEnum";
import sequelize from "sequelize";
import db from "./database";

class VehicleModel extends Model {
  declare vehicleId: string;
  declare vehicleNumber: string;
  declare fkVehicleCompanyId: string;
  declare brand: string;
  declare licensePlate: string;
  declare chassisNumber: string;
  declare fabricationYear: string;
  declare modelYear: string;
  declare renavan: string;
  declare fkVehicleTypeVehicleId: string;
  declare capacity: number;
  declare model: string;
  declare hasWifi: boolean;
  declare cameraType: CameraTypeEnum;

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
  vehicleNumber: {
    type: sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  fkVehicleCompanyId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  brand: {
    type: sequelize.STRING,
    allowNull: false,
  },
  licensePlate: {
    type: sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  chassisNumber: {
    type: sequelize.STRING,
    allowNull: false,
  },
  fabricationYear: {
    type: sequelize.STRING,
    allowNull: false,
  },
  modelYear: {
    type: sequelize.STRING,
    allowNull: false,
  },
  renavan: {
    type: sequelize.STRING,
    allowNull: false,
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
  capacity: {
    type: sequelize.INTEGER,
    allowNull: false,
  },
  model: {
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