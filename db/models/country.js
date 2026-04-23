'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Country extends Model {
    static associate(models) {
      // Country has many States
      Country.hasMany(models.State, {
        foreignKey: 'countryId',
        as: 'states'
      });
      Country.hasMany(models.Customer, { foreignKey: 'countryId', as: 'customers' });
    }
  }

  Country.init({
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
    modelName: 'Country',
    timestamps: true,
    paranoid: true
  });

  return Country;
};
