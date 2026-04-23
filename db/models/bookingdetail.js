'use strict';

module.exports = (sequelize, DataTypes) => {
  const BookingDetail = sequelize.define('BookingDetail', {
    reservationId: DataTypes.INTEGER,
    roomId: DataTypes.INTEGER,
    ratePlanId: DataTypes.INTEGER,
    totalAdults: DataTypes.INTEGER,
    totalChild: DataTypes.INTEGER,
    childAge: DataTypes.JSONB,
    extraBed: DataTypes.INTEGER,
    netAmount: DataTypes.INTEGER,
    marginAmount: DataTypes.FLOAT,
    payableAmount: DataTypes.FLOAT,
    baseRate: DataTypes.JSONB,
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {});

  BookingDetail.associate = function(models) {
    BookingDetail.belongsTo(models.Reservation, { foreignKey: 'reservationId' });
    BookingDetail.belongsTo(models.Room, { foreignKey: 'roomId', as: 'rooms' });
    BookingDetail.belongsTo(models.RatePlan, { foreignKey: 'ratePlanId', as: 'ratePlans' });
  };

  return BookingDetail;
};
