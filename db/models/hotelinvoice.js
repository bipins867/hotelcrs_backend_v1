'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class HotelInvoice extends Model {
        static associate(models) {
            HotelInvoice.belongsTo(models.Reservation, { foreignKey: 'reservationId', as: 'reservation' });
            HotelInvoice.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploader' });
        }
    }

    HotelInvoice.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        reservationId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        invoiceNumber: {
            type: DataTypes.STRING,
            allowNull: false
        },
        guestName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        hotelName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fileUrl: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
            defaultValue: 'Pending'
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        approvedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        uploadedBy: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'HotelInvoice',
        tableName: 'HotelInvoices',
        timestamps: true,
        paranoid: true
    });

    return HotelInvoice;
};
