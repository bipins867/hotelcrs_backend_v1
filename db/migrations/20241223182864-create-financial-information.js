'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FinancialInformations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id'
        }
      },
      beneficiaryName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bankName: {
        type: Sequelize.STRING,
      },
      accountNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ifscCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      swiftCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      branchAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bankCountryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Countries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      bankStateId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'States',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      bankCityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Cities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      gstNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gstRegisteredName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gstAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      b2bCommission: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      b2cCommission: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('FinancialInformations');
  }
};