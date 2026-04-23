"use strict";
module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    "Expense",
    {
      expenseType: { type: DataTypes.STRING, allowNull: false },
      expenseCategory: { type: DataTypes.STRING, allowNull: false },
      hotelId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Hotels", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      bookingId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      modeOfPayment: { type: DataTypes.STRING, allowNull: true },
      expenseDate: { type: DataTypes.DATEONLY, allowNull: true },
      remark: { type: DataTypes.TEXT },
      receipt: { type: DataTypes.JSONB },
      employeeName: { type: DataTypes.STRING },
      salaryMonth: { type: DataTypes.STRING },
      personName: { type: DataTypes.STRING },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    },
    {}
  );

  Expense.associate = function (models) {
    Expense.belongsTo(models.Hotel, { foreignKey: "hotelId", as: "hotel" });
    Expense.belongsTo(models.Reservation, { foreignKey: "bookingId", targetKey: "bookingId", as: "booking", constraints: false });
    Expense.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Expense.belongsTo(models.User, { foreignKey: "updatedBy", as: "updater" });
  };

  return Expense;
};


