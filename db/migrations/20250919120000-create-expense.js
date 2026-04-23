"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Expenses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      expenseType: { type: Sequelize.STRING, allowNull: false },
      expenseCategory: { type: Sequelize.STRING, allowNull: false },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Hotels", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      bookingId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      modeOfPayment: { type: Sequelize.STRING, allowNull: true },
      expenseDate: { type: Sequelize.DATEONLY, allowNull: true },
      remark: { type: Sequelize.TEXT },
      receipt: { type: Sequelize.JSONB },
      employeeName: { type: Sequelize.STRING },
      salaryMonth: { type: Sequelize.STRING },
      personName: { type: Sequelize.STRING },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("Expenses");
  },
};


