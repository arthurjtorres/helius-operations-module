// BusTimetableModel

import { DataTypes, Model } from "sequelize";
import db from "./database";
import sequelize from "sequelize";

class BusTimetableModel extends Model {
  declare busTimetableId: string;
  declare timetableName: string;
  declare timetableCode: string;
  declare kml?: string;
  declare startDate?: Date;
  declare endDate?: Date;
  declare fkBusTimetableLocationStartId: string;
  declare fkBusTimetableLocationEndId: string;

  declare createdAt: Date;
  declare createdBy: string;
  declare updatedAt: Date;
  declare updatedBy: string;
  declare activated: boolean;
}

BusTimetableModel.init(
  {
    busTimetableId: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    timetableName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timetableCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kml: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fkBusTimetableLocationStartId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "location",
        key: "location_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    fkBusTimetableLocationEndId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "location",
        key: "location_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
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
    tableName: "bus_timetable",
    schema: "registry",
    timestamps: false,
    underscored: true,
  }
);

export default BusTimetableModel;