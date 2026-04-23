'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Payments', 'invoiceNumber', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addIndex('Payments', ['invoiceNumber'], { unique: true, name: 'payments_invoice_number_unique' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Payments', 'payments_invoice_number_unique');
    await queryInterface.removeColumn('Payments', 'invoiceNumber');
  }
};


