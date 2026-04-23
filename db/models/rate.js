'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Rate extends Model {
    static associate(models) {
      Rate.belongsTo(models.RoomType, { foreignKey: 'roomTypeId', as: 'roomType' });
      Rate.belongsTo(models.RatePlan, { foreignKey: 'ratePlanId', as: 'ratePlan' });
    }
  }

  Rate.init({
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    roomTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ratePlanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Rate',
    timestamps: true,
    paranoid: true
  });

  return Rate;
};
