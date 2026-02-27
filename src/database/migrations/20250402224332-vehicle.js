// migration vehicle

'use strict';

const { DataTypes } =require('sequelize')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable(
      'vehicle', 
      {
        vehicle_id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
        },
        vehicle_number: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        fk_vehicle_company_id: {
          type: DataTypes.UUID,
          allowNull:false,
          references: {
            model: 'company',
            key: 'company_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        brand: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        license_plate: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        chassis_number: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        fabrication_year: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        model_year: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        renavan: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        fk_vehicle_type_vehicle_id: {
          type: DataTypes.UUID,
          allowNull:false,
          references: {
            model: 'type_vehicle',
            key: 'type_vehicle_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },   
        capacity: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        model: {
          type: Sequelize.STRING,
          allowNull: false,
        },   
        has_wifi: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
        },
        camera_type: {
          type: Sequelize.STRING,
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
        schema: 'operational_control'
      })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('vehicle', {
      schema: 'operational_control'
    })
  }
};
