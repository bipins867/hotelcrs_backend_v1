'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Hotels', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      hotelCode: {
        type: Sequelize.STRING(10)
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      countryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Countries',
          key: 'id'
        }
      },
      stateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'States',
          key: 'id'
        }
      },
      cityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cities',
          key: 'id'
        }
      },
      locationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Locations',
          key: 'id'
        }
      },
      map: {
        type: Sequelize.STRING,
        allowNull: true
      },
      latitude: {
        type: Sequelize.STRING,
        allowNull: true
      },
      longitude: {
        type: Sequelize.STRING,
        allowNull: true
      },
      typeOfHotel: {
        type: Sequelize.STRING,
        allowNull: false
      },
      numberOfRooms: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      mobile: {
        type: Sequelize.JSON,
        allowNull: true
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isDraft: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
      },
      logo: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      email: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hotelChainId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'HotelChains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Hotels');
  }
};