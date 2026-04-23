'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdultRate extends Model {
    static associate(models) {
      AdultRate.belongsTo(models.RoomRate, {
        foreignKey: 'rateId',
        as: 'roomRate',
      });
    }
  }

  AdultRate.init(
    {
      rateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      adult: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
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
      modelName: 'AdultRate',
      tableName: 'AdultRates',
      timestamps: true,
      paranoid: false, // keep false unless you plan soft deletes
      indexes: [
        {
          name: 'idx_adult_rates_rate_adult',
          unique: true,
          fields: ['rateId', 'adult'],
        },
      ],
    }
  );

  return AdultRate;
};
