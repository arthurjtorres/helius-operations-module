// migration location

'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'location',
      {
        location_id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
        },
        location_name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        location_ceturb_code: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        location_globus_code: {
          type: Sequelize.STRING,
        },
        location_type: {
          type: Sequelize.STRING,
          allowNull: false
        },
        location_acronym: {
          type: Sequelize.STRING,
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
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('location', {
      schema: 'operational_control'
    })
  }
};

