'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BankStatements', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      bankName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      accountNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ifscCode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      branchCountryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Countries',
          key: 'id'
        }
      },
      branchStateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'States',
          key: 'id'
        }
      },
      branchCityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cities',
          key: 'id'
        }
      },
      transactionDate: {
        type: Sequelize.DATEONLY
      },
      srNo: { type: Sequelize.INTEGER },
      type: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      debit: { type: Sequelize.DECIMAL(15, 2) },
      credit: { type: Sequelize.DECIMAL(15, 2) },
      balance: { type: Sequelize.DECIMAL(15, 2) },
      valueDate: { type: Sequelize.DATEONLY },
      branch: { type: Sequelize.STRING },
      refChqNo: { type: Sequelize.STRING },
      withdraws: { type: Sequelize.DECIMAL(15, 2) },
      deposit: { type: Sequelize.DECIMAL(15, 2) },
      transactionId: { type: Sequelize.STRING },
      txnPostedDate: { type: Sequelize.DATEONLY },
      chequeNo: { type: Sequelize.STRING },
      crDr: { type: Sequelize.ENUM('CR', 'DR') },
      transactionAmountInr: { type: Sequelize.DECIMAL(15, 2) },
      availableBalanceInr: { type: Sequelize.DECIMAL(15, 2) },
      narration: { type: Sequelize.TEXT },
      chqRefNo: { type: Sequelize.STRING },
      withdrawalAmt: { type: Sequelize.DECIMAL(15, 2) },
      depositAmt: { type: Sequelize.DECIMAL(15, 2) },
      closingBalance: { type: Sequelize.DECIMAL(15, 2) },
      serial: { type: Sequelize.INTEGER },
      amount: { type: Sequelize.DECIMAL(15, 2) },
      transactionType: { type: Sequelize.STRING },
      mainCategory: {
        type: Sequelize.STRING,
      },
      category: { 
        type: Sequelize.STRING,
        allowNull: true 
      },
      hotelId: { type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Hotels',
          key: 'id'
        }
      },
      bookingId: { 
        type: Sequelize.STRING,
        allowNull: true 
      },
      modeOfPayment: { type: Sequelize.STRING },
      comments: { type: Sequelize.TEXT },
      paymentProof: { type: Sequelize.JSONB },
      paymentCategory: { type: Sequelize.STRING },
      salaryMonth: { type: Sequelize.STRING },
      employeeName: { type: Sequelize.STRING },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BankStatements');
  }
};
