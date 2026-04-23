'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class State extends Model {
    static associate(models) {
      State.belongsTo(models.Country, {
        foreignKey: 'countryId',
        as: 'country'
      });

      State.hasMany(models.City, {
        foreignKey: 'stateId',
        as: 'city'
      });
      State.hasMany(models.Customer, { foreignKey: 'stateId', as: 'customers' });
    }
  }

  State.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    image: {
      type: DataTypes.JSONB,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    countryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    gstDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'State',
    paranoid: true,
    timestamps: true
  });

  return State;
};
