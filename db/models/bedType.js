'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BedType extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  BedType.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deletedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'BedType',
      timestamps: true,
      paranoid: true,
    }
  );
  return BedType;
};
