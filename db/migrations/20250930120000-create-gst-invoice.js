'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GSTInvoices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      reservationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Reservations', key: 'id' },
        onDelete: 'SET NULL'
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Hotels', key: 'id' },
        onDelete: 'SET NULL'
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Customers', key: 'id' },
        onDelete: 'SET NULL'
      },
      invoiceDate: { type: Sequelize.DATEONLY, allowNull: false },
      fromDate: { type: Sequelize.DATEONLY, allowNull: true },
      toDate: { type: Sequelize.DATEONLY, allowNull: true },
      baseAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      taxRate: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 12 },
      sgstAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      cgstAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      igstAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      totalAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      isSystemGenerated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.ENUM('Active', 'Disabled'), defaultValue: 'Active' },
      pdfUrl: { type: Sequelize.STRING },
      metadata: { type: Sequelize.JSONB },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
      },
      uploadedAt: { type: Sequelize.DATE },
      createdBy: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' } },
      updatedBy: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' } },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
      deletedAt: { allowNull: true, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('GSTInvoices', ['invoiceNumber']);
    await queryInterface.addIndex('GSTInvoices', ['hotelId']);
    await queryInterface.addIndex('GSTInvoices', ['customerId']);
    await queryInterface.addIndex('GSTInvoices', ['reservationId']);
    await queryInterface.addIndex('GSTInvoices', ['invoiceDate']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('GSTInvoices');
  }
};


