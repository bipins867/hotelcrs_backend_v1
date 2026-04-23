'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ResturantInfo', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      breakfastCost: Sequelize.INTEGER,
      vegLunchCost: Sequelize.INTEGER,
      nonVegLunchCost: Sequelize.INTEGER,
      vegDinnerCost: Sequelize.INTEGER,
      nonVegDinnerCost: Sequelize.INTEGER,
      outsideFood: Sequelize.STRING,
      olaUberRapido: Sequelize.STRING,

      resturantMenu: Sequelize.JSONB,
      barMenu: Sequelize.JSONB,
      itineraryMenu: Sequelize.JSONB,
      menuType: Sequelize.STRING,
      breakfastType: Sequelize.STRING,
      breakfastServed: Sequelize.STRING,
      checkInCheckOutDetails: Sequelize.JSONB,

      driverDetails: Sequelize.JSONB,
      guestInfo: Sequelize.TEXT,

      resturantDetails: Sequelize.JSONB,
      resturantNumber: Sequelize.JSONB,
      resturantEmail: Sequelize.JSONB,
      transportCabDetails: Sequelize.JSONB,

      pickupPointDetails: Sequelize.JSONB,
      hourlyCharge: Sequelize.JSONB,
      outStationCharge: Sequelize.JSONB,
      extraKmCharge: Sequelize.JSONB,

      paymentLinks: Sequelize.JSONB,
      policies: Sequelize.JSONB,
      services: Sequelize.JSONB,

      terms: Sequelize.JSONB,
      numberOfCars: Sequelize.JSONB,

      specialNote: Sequelize.TEXT,
      carsEmailId: Sequelize.JSONB,
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ResturantInfo');
  },
};
