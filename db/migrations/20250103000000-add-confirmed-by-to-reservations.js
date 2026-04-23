'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reservations', 'confirmedBy', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'isConfirmed'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Reservations', 'confirmedBy');
  }
};
