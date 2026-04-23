'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoomView extends Model {
    static associate(models) {
      // Define associations here if necessary
    }
  }

  RoomView.init(
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
      modelName: 'RoomView',
      timestamps: true,
      paranoid: true, // Enables soft deletion
    }
  );

  return RoomView;
};
