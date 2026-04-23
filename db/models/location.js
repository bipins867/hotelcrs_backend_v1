"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      // Define associations here
      Location.belongsTo(models.Country, { foreignKey: "countryId", as: "country" });
      Location.belongsTo(models.State, { foreignKey: "stateId", as: "state" });
      Location.belongsTo(models.City, { foreignKey: "cityId", as: "city" });
    }
  }

  Location.init(
    {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING,
        unique: true,
      },
      latitude: {
        type: DataTypes.STRING,
      },
      longitude: {
        type: DataTypes.STRING,
      },
      image: {
        type: DataTypes.JSONB,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      modelName: "Location",
      timestamps: true,
      paranoid: true,
    }
  );

  return Location;
};
