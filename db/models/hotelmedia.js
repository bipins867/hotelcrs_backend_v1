'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HotelMedia extends Model {
    static associate(models) {
      HotelMedia.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
    }
  }

  HotelMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        unique: true
      },
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      photos: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      videos: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      youtubeUrls: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of YouTube video URLs'
      },
      propertyChain: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'HotelMedia',
      timestamps: true,
      paranoid: true
    }
  );
  return HotelMedia;
};
