'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Rooms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id'
        }
      },
      roomName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      totalRoom: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      images: {
        type: Sequelize.JSONB
      },
      videos: {
        type: Sequelize.JSONB
      },
      area: {
        type: Sequelize.FLOAT
      },
      roomType: {
        type: Sequelize.INTEGER
      },
      roomView: {
        type: Sequelize.INTEGER
      },
      smokingPreference: {
        type: Sequelize.STRING
      },
      bedType: {
        type: Sequelize.INTEGER
      },
      baseAdults: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      maximumAdults: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      numberOfMaxChildren: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      maximumOccupancy: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.INTEGER,
      },
      description: {
        type: Sequelize.TEXT
      },
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      youtubeUrls: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of YouTube video URLs with embed URLs and video IDs'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Rooms', { cascade: true });
  }
};