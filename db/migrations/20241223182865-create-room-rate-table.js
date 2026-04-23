module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('RoomRates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ratePlanId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'RatePlans',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      contractType: Sequelize.STRING,
      idate: Sequelize.DATEONLY,
      available: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      paidChildFiveToTwelve: Sequelize.FLOAT,
      extraAdultAmount: Sequelize.FLOAT,
      restrictionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Restrictions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdBy: Sequelize.STRING,
      updatedBy: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
      deletedAt: Sequelize.DATE,

    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('RoomRates');
  }
};
