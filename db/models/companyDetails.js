'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompanyDetails extends Model {
    static associate(models) {
    }
  }

  CompanyDetails.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyName: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.TEXT,
    },
    companyLogo: {
      type: DataTypes.STRING,
    },
    signatureImage: {
      type: DataTypes.STRING,
    },
    gstOnCommissionByOTA: {
      type: DataTypes.DECIMAL,
    },
    tcsDeductionByOTA: {
      type: DataTypes.DECIMAL,
    },
    tdsDeductionByOTA: {
      type: DataTypes.DECIMAL,
    },
    emails: {
      type: DataTypes.JSONB,
    },
    phones: {
      type: DataTypes.JSONB,
    },
    panNo: {
      type: DataTypes.STRING,
    },
    companyRegistrationNo: {
      type: DataTypes.STRING,
    },
    hsnSacCode: {
      type: DataTypes.STRING,
    },
    tanNo: {
      type: DataTypes.STRING,
    },
    gstPercentageLessThan7500: {
      type: DataTypes.FLOAT,
    },
    gstPercentageGreaterThan7500: {
      type: DataTypes.FLOAT,
    },
    bankDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of bank account details with active flag - only one can be active at a time'
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'CompanyDetails',
    tableName: 'CompanyDetails',
  });

  return CompanyDetails;
}; 