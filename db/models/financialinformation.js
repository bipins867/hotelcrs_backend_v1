"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FinancialInformation extends Model {
    static associate(models) {
      FinancialInformation.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
      FinancialInformation.belongsTo(models.Country, { foreignKey: 'bankCountryId', as: 'bankCountry' });
      FinancialInformation.belongsTo(models.State, { foreignKey: 'bankStateId', as: 'bankState' });
      FinancialInformation.belongsTo(models.Customer, { foreignKey: 'bankCityId', as: 'bankCustomers' });
    }
  }

  FinancialInformation.init({
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    beneficiaryName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    swiftCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankCountryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bankStateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bankCityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gstNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gstRegisteredName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gstAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    b2bCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    b2cCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "FinancialInformation",
    timestamps: true,
    paranoid: true
  });

  return FinancialInformation;
};
