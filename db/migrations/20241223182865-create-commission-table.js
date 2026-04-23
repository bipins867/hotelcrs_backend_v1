module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Commissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      countryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Countries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'States',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Hotels',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      b2cCommission: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      b2bCommission: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      taggedHotels: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      updatedBy: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
      rateMode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      singleOccupancy: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      doubleOccupancy: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      tripleOccupancy: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      extraBed: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      percentageModeValue: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      monthlySubscriptionCharge: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      monthlyChannelManagerCharge: {
        type: Sequelize.FLOAT,
        allowNull: true,
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Commissions');
  },
};