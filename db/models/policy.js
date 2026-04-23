"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Policy extends Model {
    static associate(models) {
      Policy.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
    }
  }

  Policy.init({
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
    generalPolicies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    corporatePolicies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bulkGroupPolicies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Policy",
    timestamps: true,
    paranoid: true
  });

  return Policy;
};

