"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RoomRate extends Model {
    static associate(models) {
      RoomRate.belongsTo(models.Hotel, {
        foreignKey: "hotelId",
        as: "hotel",
      });
      RoomRate.belongsTo(models.Room, {
        foreignKey: "roomId",
        as: "room",
      });
      RoomRate.belongsTo(models.RatePlan, {
        foreignKey: "ratePlanId",
        as: "ratePlan",
      });
      // RoomRate.hasOne(models.Restriction, {
      //   foreignKey: 'rateId',
      //   as: 'restriction',
      // });
      RoomRate.hasMany(models.AdultRate, {
        foreignKey: "rateId",
        as: "adultRates",
      });
      RoomRate.belongsTo(models.Restriction, {
        foreignKey: "restrictionId",
        as: "restriction",
      });
    }
  }

  RoomRate.init(
    {
      hotelId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ratePlanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      restrictionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      contractType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      idate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      available: {
        type: DataTypes.INTEGER,
      },
      paidChildFiveToTwelve: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      extraAdultAmount: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      updatedBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RoomRate",
      timestamps: true
    }
  );

  return RoomRate;
};
