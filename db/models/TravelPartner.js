"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TravelPartner extends Model {
    static associate(models) {
      TravelPartner.belongsTo(models.Country, {
        foreignKey: "countryId",
        as: "country",
      });
      TravelPartner.belongsTo(models.State, {
        foreignKey: "stateId",
        as: "state",
      });
      TravelPartner.belongsTo(models.City, {
        foreignKey: "cityId",
        as: "city",
      });
      TravelPartner.belongsTo(models.Country, {
        foreignKey: "bankCountry",
        as: "bankCountryDetails",
      });
      TravelPartner.belongsTo(models.State, {
        foreignKey: "bankState",
        as: "bankStateDetails",
      });
      TravelPartner.belongsTo(models.City, {
        foreignKey: "bankCity",
        as: "bankCityDetails",
      });
    }
  }

  TravelPartner.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      partnerName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 255],
        },
      },
      contactDetails: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      mobile: {
        type: DataTypes.JSONB,
      },
      email: {
        type: DataTypes.JSONB,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
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
      bankAccountNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      ifscCode: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      swiftCode: {
        type: DataTypes.STRING,
      },
      bankName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      bankCity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      bankState: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      bankCountry: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "TravelPartner",
      timestamps: true,
      paranoid: true,
    }
  );

  return TravelPartner;
};
