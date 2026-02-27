// migration busTimetable

'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable(
      'bus_timetable',
      {
        bus_timetable_id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
        },
        timetable_name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        timetable_code: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        kml: {
          type: Sequelize.STRING,
          allowNull: true
        },
        start_date: {
          type: Sequelize.DATEONLY,
        },
        end_date: {
          type: Sequelize.DATEONLY,
        },
        fk_busTimetable_location_start_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'location',
            key: 'location_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fk_busTimetable_location_end_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'location',
            key: 'location_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
        schema: 'operational_control'
      }
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('bus_timetable', {
      schema: 'operational_control'
    })
  }
};
