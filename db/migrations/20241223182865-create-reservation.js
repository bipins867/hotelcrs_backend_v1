'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Reservations', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      bookingId: Sequelize.STRING,
      hotelId: Sequelize.INTEGER,
      customerId: Sequelize.INTEGER,
      checkingDate: Sequelize.DATEONLY,
      checkoutDate: Sequelize.DATEONLY,
      totalNight: Sequelize.INTEGER,
      totalRooms: Sequelize.INTEGER,
      travelAgentId: Sequelize.INTEGER,
      totalAdults: Sequelize.INTEGER,
      totalChildren: Sequelize.INTEGER,
      netAmt: Sequelize.DECIMAL,
      saleAmt: Sequelize.DECIMAL,
      totalMargin: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      totalPayableAmount: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      otaCommission: Sequelize.DECIMAL,
      roomCharges: Sequelize.DECIMAL,
      hotelTaxes: Sequelize.DECIMAL,
      advance: Sequelize.DECIMAL,
      balance: Sequelize.DECIMAL,
      pnr: Sequelize.STRING,
      cancellationPolicy: Sequelize.STRING,
      gstReminder: Sequelize.INTEGER,
      sendInvoice: Sequelize.INTEGER,
      paymentTypeId: Sequelize.INTEGER,
      comments: Sequelize.TEXT,
      hotelNote: Sequelize.TEXT,
      customerNote: Sequelize.TEXT,
      adminNote: Sequelize.TEXT,
      sendGuest: Sequelize.INTEGER,
      status: Sequelize.STRING,
      tcs: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Tax Collected at Source amount'
      },
      tds: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Tax Deducted at Source amount'
      },
      generalPolicies: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'General policies for the reservation'
      },
      corporatePolicies: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Corporate policies for the reservation'
      },
      bulkGroupPolicies: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Bulk group policies for the reservation'
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
      deletedAt: Sequelize.DATE
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Reservations');
  }
};
