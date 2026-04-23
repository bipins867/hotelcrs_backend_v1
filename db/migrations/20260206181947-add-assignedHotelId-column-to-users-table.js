'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'assignedHotelId', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.removeColumn('Users', 'role');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'assignedHotelId');
    await queryInterface.addColumn('Users', 'role', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
