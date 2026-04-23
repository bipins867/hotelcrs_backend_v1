'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reservations', 'isConfirmed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'status'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Reservations', 'isConfirmed');
  }
};


