'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Payments', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      reservationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Reservations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      paymentDate: { type: Sequelize.DATEONLY, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      modeOfPayment: { type: Sequelize.STRING, allowNull: false },
      bankReference: { type: Sequelize.STRING, allowNull: false },
      remark: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.FLOAT, allowNull: false },
      adjustmentBooking: { type: Sequelize.STRING },
      adjustmentAmount: { type: Sequelize.FLOAT },
      receipt: { type: Sequelize.JSONB },
      upi: { type: Sequelize.STRING },
      note: { type: Sequelize.TEXT, allowNull: true },
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
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
      deletedAt: { type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Payments');
  }
};