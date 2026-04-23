'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CompanyDetails', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      companyName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      companyLogo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      emails: { // array of strings
        type: Sequelize.JSONB,
        allowNull: false
      },
      phones: { // array of strings
        type: Sequelize.JSONB,
        allowNull: false
      },
      panNo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      companyRegistrationNo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      hsnSacCode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tanNo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gstPercentageLessThan7500: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      gstPercentageGreaterThan7500: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      signatureImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
      createdBy: {
        type: Sequelize.INTEGER,
      },
      updatedBy: {
        type: Sequelize.INTEGER,
      },
      bankDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of bank account details with active flag - only one can be active at a time'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CompanyDetails');
  }
}; 