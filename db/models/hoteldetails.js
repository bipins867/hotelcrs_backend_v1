'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HotelDetails extends Model {
    static associate(models) {
      HotelDetails.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
    }
  }

  HotelDetails.init(
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
      starRating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        }
      },
      numberOfBuildings: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      numberOfFloors: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 for Inactive, 1 for Active',
      },
    },
    {
      sequelize,
      modelName: 'HotelDetails',
      timestamps: true,
      paranoid: true
    }
  );
  return HotelDetails;
};
