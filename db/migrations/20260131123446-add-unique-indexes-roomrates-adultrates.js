'use strict';

module.exports = {
  // IMPORTANT: disable transaction
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_room_rates_unique
      ON "RoomRates" ("hotelId", "roomId", "ratePlanId", "idate", "contractType")
      WHERE "deletedAt" IS NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_adult_rates_rate_adult
      ON "AdultRates" ("rateId", "adult");
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_room_rates_unique;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_adult_rates_rate_adult;
    `);
  },
};
