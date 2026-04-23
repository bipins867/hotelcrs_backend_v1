'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('CompanyDetails', 'gstOnCommissionByOTA', {
      type: Sequelize.DECIMAL,
      allowNull: true
    });

    await queryInterface.addColumn('CompanyDetails', 'tcsDeductionByOTA', {
      type: Sequelize.DECIMAL,
      allowNull: true
    });

    await queryInterface.addColumn('CompanyDetails', 'tdsDeductionByOTA', {
      type: Sequelize.DECIMAL,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('CompanyDetails', 'gstOnCommissionByOTA');
    await queryInterface.removeColumn('CompanyDetails', 'tcsDeductionByOTA');
    await queryInterface.removeColumn('CompanyDetails', 'tdsDeductionByOTA');
  }
};
