'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class City extends Model {
    static associate(models) {
      // Define associations here
      City.belongsTo(models.State, { foreignKey: 'stateId', as: 'state' });
      City.belongsTo(models.Country, { foreignKey: 'countryId', as: 'country' });
      City.hasMany(models.Customer, { foreignKey: 'cityId', as: 'customers' });
    }
  }

  City.init({
    countryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stateId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    code: {
      type: DataTypes.STRING,
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
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'City',
    timestamps: true,
    paranoid: true,
  });
  
  return City;
};
