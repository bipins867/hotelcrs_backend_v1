'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GSTInvoice extends Model {
    static associate(models) {
      GSTInvoice.belongsTo(models.Reservation, { foreignKey: 'reservationId', as: 'reservation' });
      GSTInvoice.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
      GSTInvoice.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      GSTInvoice.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      GSTInvoice.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
      GSTInvoice.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploader' });
    }
  }

  GSTInvoice.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoiceNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    reservationId: { type: DataTypes.INTEGER },
    hotelId: { type: DataTypes.INTEGER },
    customerId: { type: DataTypes.INTEGER },
    invoiceDate: { type: DataTypes.DATEONLY, allowNull: false },
    fromDate: { type: DataTypes.DATEONLY },
    toDate: { type: DataTypes.DATEONLY },
    baseAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    taxRate: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 12 },
    sgstAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    cgstAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    igstAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    isSystemGenerated: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.ENUM('Active', 'Disabled'), defaultValue: 'Active' },
    pdfUrl: { type: DataTypes.STRING },
    metadata: { type: DataTypes.JSONB },
    uploadedBy: { type: DataTypes.INTEGER },
    uploadedAt: { type: DataTypes.DATE },
    createdBy: { type: DataTypes.INTEGER },
    updatedBy: { type: DataTypes.INTEGER }
  }, {
    sequelize,
    modelName: 'GSTInvoice',
    tableName: 'GSTInvoices',
    timestamps: true,
    paranoid: true
  });

  return GSTInvoice;
};


