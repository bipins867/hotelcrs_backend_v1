'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BookingDetails', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      reservationId: Sequelize.INTEGER,
      roomId: Sequelize.INTEGER,
      ratePlanId: Sequelize.INTEGER,
      totalAdults: Sequelize.INTEGER,
      totalChild: Sequelize.INTEGER,
      childAge: Sequelize.JSONB,
      extraBed: Sequelize.INTEGER,
      netAmount: Sequelize.INTEGER,
      marginAmount: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      payableAmount: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      baseRate: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Base rate information for each night of the booking'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
      deletedAt: Sequelize.DATE,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('BookingDetails');
  }
};
