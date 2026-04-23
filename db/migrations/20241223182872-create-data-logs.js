'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DataLogs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      tableName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      operation: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      recordId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dataBefore: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      dataAfter: {
        type: Sequelize.JSON,
        allowNull: true,
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DataLogs');
  },
};
