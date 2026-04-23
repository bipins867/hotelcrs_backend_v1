"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Hotel extends Model {
    static associate(models) {
      Hotel.belongsTo(models.Country, {
        foreignKey: "countryId",
        as: "country",
      });
      Hotel.belongsTo(models.State, { foreignKey: "stateId", as: "state" });
      Hotel.belongsTo(models.City, { foreignKey: "cityId", as: "city" });
      Hotel.belongsTo(models.Location, {
        foreignKey: "locationId",
        as: "location",
      });
      Hotel.hasOne(models.FinancialInformation, {
        foreignKey: "hotelId",
        as: "financialInformation",
      });
      Hotel.hasOne(models.Policy, { foreignKey: "hotelId", as: "policy" });
      Hotel.hasMany(models.HotelTeam, { foreignKey: "hotelId", as: "team" });
      Hotel.hasOne(models.HotelMedia, { foreignKey: "hotelId", as: "media" });
      Hotel.hasOne(models.HotelDetails, {
        foreignKey: "hotelId",
        as: "additionalHotelDetails",
      });
      Hotel.belongsTo(models.HotelChain, {
        foreignKey: "hotelChainId",
        as: "hotelChain",
      });
      Hotel.hasMany(models.Room, { foreignKey: "hotelId", as: "room" });
      Hotel.hasOne(models.Commission, { foreignKey: "hotelId", as: "commission" });
      Hotel.hasOne(models.ResturantInfo, { foreignKey: "hotelId", as: "restaurantInfo" });
    }
  }

  Hotel.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hotelChainId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
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
      locationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      logo: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      map: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      longitude: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      typeOfHotel: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      numberOfRooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mobile: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      hotelGstRegStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gstInvoiceIssuedToGuestBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gstReturnFilingResponsibility: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Hotel",
      timestamps: true,
      paranoid: true,
    }
  );
  return Hotel;
};
