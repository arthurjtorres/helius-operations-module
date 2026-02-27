// VehicleTypeModel

import { DataTypes, Model } from "sequelize";
import db from "./database";
import sequelize from "sequelize";

class VehicleTypeModel extends Model {
  declare typeVehicleId: string;
  declare typeVehicleName: string;
  declare airConditioner: boolean;

  declare createdAt: Date;
  declare createdBy: string;
  declare updatedAt: Date;
  declare updatedBy: string;
  declare activated: boolean;
}

VehicleTypeModel.init(
  {
    typeVehicleId: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    typeVehicleName: {
      type: sequelize.STRING,
      allowNull: false,
    },
    airConditioner: {
      type: sequelize.BOOLEAN,
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
  },
  {
    sequelize: db,
    tableName: "type_vehicle",
    schema: "registry",
    timestamps: false,
    underscored: true,
  }
);

export default VehicleTypeModel;