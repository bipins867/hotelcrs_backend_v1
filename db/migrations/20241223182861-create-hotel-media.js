'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('HotelMedia', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id'
        }
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      photos: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      videos: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      propertyChain: {
        type: Sequelize.STRING,
        allowNull: true,
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
        type: Sequelize.DATE
      },
      youtubeUrls: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of YouTube video URLs'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('HotelMedia');
  },
};
