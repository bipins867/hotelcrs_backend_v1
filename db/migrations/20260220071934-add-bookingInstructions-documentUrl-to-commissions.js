'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Commissions', 'bookingInstructions', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('Commissions', 'documentUrl', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Commissions', 'bookingInstructions');
    await queryInterface.removeColumn('Commissions', 'documentUrl');
  },
};
