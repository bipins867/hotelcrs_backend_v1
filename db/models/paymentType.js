'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentType extends Model {
    static associate(models) {
      // Define associations if necessary
    }
  }

  PaymentType.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,  // Ensure the name is unique
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hotelNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customerNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adminNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'PaymentType',
    timestamps: true,  // Enable createdAt and updatedAt
    paranoid: true,  // Enable soft deletes
  });

  return PaymentType;
};
