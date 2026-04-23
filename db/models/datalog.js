'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DataLog extends Model {
    static associate(models) {
    }
  }

  DataLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    tableName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    operation: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
      allowNull: false,
      validate: {
        isIn: [['CREATE', 'UPDATE', 'DELETE']]
      }
    },
    recordId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dataBefore: {
      type: DataTypes.JSON,
      allowNull: true
    },
    dataAfter: {
      type: DataTypes.JSON,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'DataLog',
    tableName: 'DataLogs',
    timestamps: true,
  });

  return DataLog;
};
