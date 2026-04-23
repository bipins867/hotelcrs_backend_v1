'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankStatement extends Model {
    static associate(models) {
      BankStatement.belongsTo(models.Country, { 
        foreignKey: 'branchCountryId', 
        as: 'branchCountry' 
      });
      BankStatement.belongsTo(models.State, { 
        foreignKey: 'branchStateId', 
        as: 'branchState' 
      });
      BankStatement.belongsTo(models.City, { 
        foreignKey: 'branchCityId', 
        as: 'branchCity' 
      });
      BankStatement.belongsTo(models.Hotel, { 
        foreignKey: 'hotelId', 
        as: 'hotel' 
      });
      BankStatement.belongsTo(models.User, { 
        foreignKey: 'createdBy', 
        as: 'creator' 
      });
      BankStatement.belongsTo(models.User, { 
        foreignKey: 'updatedBy', 
        as: 'updater' 
      });
    }
  }

  BankStatement.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    branchCountryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Countries',
        key: 'id'
      }
    },
    branchStateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'States',
        key: 'id'
      }
    },
    branchCityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Cities',
        key: 'id'
      }
    },
    transactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    srNo: { 
      type: DataTypes.INTEGER 
    },
    type: { 
      type: DataTypes.STRING 
    },
    description: { 
      type: DataTypes.TEXT 
    },
    debit: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    credit: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    balance: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    valueDate: { 
      type: DataTypes.DATEONLY 
    },
    branch: { 
      type: DataTypes.STRING 
    },
    refChqNo: { 
      type: DataTypes.STRING 
    },
    withdraws: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    deposit: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    transactionId: { 
      type: DataTypes.STRING 
    },
    txnPostedDate: { 
      type: DataTypes.DATEONLY 
    },
    chequeNo: { 
      type: DataTypes.STRING 
    },
    crDr: { 
      type: DataTypes.ENUM('CR', 'DR') 
    },
    transactionAmountInr: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    availableBalanceInr: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    narration: { 
      type: DataTypes.TEXT 
    },
    chqRefNo: { 
      type: DataTypes.STRING 
    },
    withdrawalAmt: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    depositAmt: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    closingBalance: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    serial: { 
      type: DataTypes.INTEGER 
    },
    amount: { 
      type: DataTypes.DECIMAL(15, 2) 
    },
    transactionType: { 
      type: DataTypes.STRING 
    },
    mainCategory: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hotelId: { 
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Hotels',
        key: 'id'
      }
    },
    bookingId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modeOfPayment: { 
      type: DataTypes.STRING 
    },
    comments: { 
      type: DataTypes.TEXT 
    },
    paymentProof: { 
      type: DataTypes.JSONB 
    },
    paymentCategory: { 
      type: DataTypes.STRING 
    },
    salaryMonth: { 
      type: DataTypes.STRING 
    },
    employeeName: { 
      type: DataTypes.STRING 
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  }, {
    sequelize,
    modelName: 'BankStatement',
    tableName: 'BankStatements',
    timestamps: true,
    paranoid: true
  });

  return BankStatement;
};
