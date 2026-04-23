'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RatePlan extends Model {
    static associate(models) {
      // Define relationships here if needed
    }
  }

  RatePlan.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 1, // Default to "enabled"
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
      modelName: 'RatePlan',
      timestamps: true, // This enables createdAt and updatedAt
      paranoid: true, // This enables soft delete (adds a deletedAt column)
    }
  );

  return RatePlan;
};
