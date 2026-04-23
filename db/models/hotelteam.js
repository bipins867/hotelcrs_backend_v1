'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HotelTeam extends Model {
    static associate(models) {
      HotelTeam.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
    }
  }

  HotelTeam.init(
    {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      designation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      mobile: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      email: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },

    {
      sequelize,
      modelName: 'HotelTeam',
      timestamps: true,
      paranoid: true
    }
  );
  return HotelTeam;
};
