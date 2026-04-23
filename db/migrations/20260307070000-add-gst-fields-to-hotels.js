'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Hotels', 'hotelGstRegStatus', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
        });
        await queryInterface.addColumn('Hotels', 'gstInvoiceIssuedToGuestBy', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
        });
        await queryInterface.addColumn('Hotels', 'gstReturnFilingResponsibility', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Hotels', 'hotelGstRegStatus');
        await queryInterface.removeColumn('Hotels', 'gstInvoiceIssuedToGuestBy');
        await queryInterface.removeColumn('Hotels', 'gstReturnFilingResponsibility');
    }
};
