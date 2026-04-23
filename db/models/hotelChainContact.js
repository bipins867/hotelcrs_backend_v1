"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class HotelChainContact extends Model {
    static associate(models) {
      HotelChainContact.belongsTo(models.HotelChain, { foreignKey: 'hotelChainId', as: 'hotelChain' });
    }
  }

  HotelChainContact.init({
    hotelChainId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  },
  {
    sequelize,
    modelName: "HotelChainContact",
    timestamps: true,
    paranoid: true
  });

  return HotelChainContact;
};

