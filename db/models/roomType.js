'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoomType extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  RoomType.init(
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
      modelName: 'RoomType',
      timestamps: true,
      paranoid: true,
    }
  );
  return RoomType;
};
