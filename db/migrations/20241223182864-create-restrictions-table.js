module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Restrictions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rateId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      blockInventory: Sequelize.BOOLEAN,
      unblockInventory: Sequelize.BOOLEAN,
      closeToArrival: Sequelize.BOOLEAN,
      inactivateCTA: Sequelize.BOOLEAN,
      closeToDeparture: Sequelize.BOOLEAN,
      inactivateCTD: Sequelize.BOOLEAN,
      minLengthOfStay: Sequelize.INTEGER,
      cutoff: Sequelize.INTEGER,
      cutoffType: Sequelize.STRING,
      cutoffValue: Sequelize.FLOAT,
      createdBy: Sequelize.STRING,
      updatedBy: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Restrictions');
  }
};
