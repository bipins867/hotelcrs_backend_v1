module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AdultRates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'RoomRates',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      adult: Sequelize.INTEGER,
      amount: Sequelize.FLOAT,
      createdBy: Sequelize.STRING,
      updatedBy: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('AdultRates');
  }
};
