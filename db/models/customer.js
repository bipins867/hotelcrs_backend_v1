"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.belongsTo(models.Country, {
        foreignKey: "countryId",
        as: "country",
      });
      Customer.belongsTo(models.State, { foreignKey: "stateId", as: "state" });
      Customer.belongsTo(models.City, { foreignKey: "cityId", as: "city" });
    }
  }

  Customer.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.JSONB,
      },
      mobile: {
        type: DataTypes.JSONB,
      },
      gstNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gstAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      countryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Customer",
      timestamps: true,
      paranoid: true,
    }
  );

  return Customer;
};
