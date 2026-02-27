// migration vehicleType

'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'type_vehicle',
      {
        type_vehicle_id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
        },
        type_vehicle_name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        air_conditioner: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
        },

        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        created_by: {
          allowNull: false,
          type: DataTypes.UUID,
          references: {
            model: {
              tableName: "user",
              schema: "access_control",
            },
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_by: {
          allowNull: false,
          type: DataTypes.UUID,
          references: {
            model: {
              tableName: "user",
              schema: "access_control",
            },
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        activated: {
          allownull: false,
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        schema: 'operational_control',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('type_vehicle', {
      schema: 'operational_control',
    });
  },
};
