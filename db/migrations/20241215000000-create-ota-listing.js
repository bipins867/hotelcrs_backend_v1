'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OtaListings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      otaName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      famousIn: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Listed', 'Not Listed', 'Email Sent', 'Pending', 'Rejected', 'Duplicate'),
        allowNull: false,
        defaultValue: 'Not Listed'
      },
      listingDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      listedBy: {
        type: Sequelize.STRING,
        allowNull: true
      },
      healthAnalysis: {
        type: Sequelize.ENUM('Completed', 'Not Completed', 'Verified 100%'),
        allowNull: true,
        defaultValue: 'Not Completed'
      },
      liveStatus: {
        type: Sequelize.ENUM('Live', 'Not Live', 'Pending', 'Rejected', 'Duplicate'),
        allowNull: false,
        defaultValue: 'Not Live'
      },
      listingUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fileUrl: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OtaListings');
  }
};
