'use strict';

module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define('Reservation', {
    bookingId: DataTypes.STRING,
    hotelId: DataTypes.INTEGER,
    customerId: DataTypes.INTEGER,
    checkingDate: DataTypes.DATEONLY,
    checkoutDate: DataTypes.DATEONLY,
    totalNight: DataTypes.INTEGER,
    totalRooms: DataTypes.INTEGER,
    travelAgentId: DataTypes.INTEGER,
    totalAdults: DataTypes.INTEGER,
    totalChildren: DataTypes.INTEGER,
    netAmt: DataTypes.DECIMAL,
    saleAmt: DataTypes.DECIMAL,
    otaCommission: DataTypes.DECIMAL,
    roomCharges: DataTypes.DECIMAL,
    hotelTaxes: DataTypes.DECIMAL,
    advance: DataTypes.DECIMAL,
    balance: DataTypes.DECIMAL,
    pnr: DataTypes.STRING,
    cancellationPolicy: DataTypes.STRING,
    paymentTypeId: DataTypes.INTEGER,
    gstReminder: DataTypes.INTEGER,
    sendInvoice: DataTypes.INTEGER,
    comments: DataTypes.TEXT,
    hotelNote: DataTypes.TEXT,
    customerNote: DataTypes.TEXT,
    adminNote: DataTypes.TEXT,
    sendGuest: DataTypes.INTEGER,
    status: DataTypes.STRING,
    isConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    totalMargin: DataTypes.FLOAT,
    totalPayableAmount: DataTypes.FLOAT,
    tcs: DataTypes.DECIMAL,
    tds: DataTypes.DECIMAL,
    generalPolicies: DataTypes.TEXT,
    corporatePolicies: DataTypes.TEXT,
    bulkGroupPolicies: DataTypes.TEXT,
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    confirmedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    oldData: DataTypes.JSONB,
    isGstRelated: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {});

  Reservation.associate = function (models) {
    Reservation.hasMany(models.BookingDetail, { foreignKey: 'reservationId', as: 'bookingDetails' });
    Reservation.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotels' });
    Reservation.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customers' });
    Reservation.belongsTo(models.TravelPartner, { foreignKey: 'travelAgentId', as: 'travelPartner' });
    Reservation.belongsTo(models.PaymentType, { foreignKey: 'paymentTypeId', as: 'paymentTypes' });
    Reservation.hasMany(models.Payment, { foreignKey: 'reservationId', as: 'payments' });
  };

  return Reservation;
};
