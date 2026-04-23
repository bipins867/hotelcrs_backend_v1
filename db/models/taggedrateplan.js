'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaggedRatePlan extends Model {
    static associate(models) {
      TaggedRatePlan.belongsTo(models.Room, { foreignKey: 'roomId', as: 'room' });
      TaggedRatePlan.belongsTo(models.RatePlan, { foreignKey: 'ratePlanId', as: 'ratePlan' });
    }
  }

  TaggedRatePlan.init(
    {
      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ratePlanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      inclusionId: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
    },
    {
      sequelize,
      modelName: 'TaggedRatePlan',
    }
  );

  return TaggedRatePlan;
};
