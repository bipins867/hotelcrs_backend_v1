'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add foreign key constraint to Restrictions table
    await queryInterface.addConstraint('Restrictions', {
      fields: ['rateId'],
      type: 'foreign key',
      name: 'restrictions_rateId_fkey',
      references: {
        table: 'RoomRates',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraint from Restrictions table
    await queryInterface.removeConstraint('Restrictions', 'restrictions_rateId_fkey');
  }
}; 