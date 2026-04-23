'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HotelChain extends Model {
    static associate(models) {
      HotelChain.hasMany(models.HotelChainContact, { foreignKey: 'hotelChainId', as: 'hotelChainContacts' });
    }
  }

  HotelChain.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      logo: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      updatedBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'HotelChain',
      timestamps: true,
      paranoid: true
    }
  );
  return HotelChain;
};
