/**
 * Direct Payment (Pay-at-Hotel) Modified Reservation WhatsApp Template to Guest
 */

const TemplateHelper = require('../../utils/templateHelper');

class DirectPaymentGuestModifiedTemplate {
  static format(variables) {
    const {
      guestName,
      hotelName,
      city,
      state,
      bookingId,
      checkInDate,
      checkOutDate,
      roomType,
      numberOfRooms,
      numberOfNights,
      totalAdults,
      totalChildren,
      originalAmount,
      advanceAmount,
      balanceAmount,
      googleMapsLink,
      checkInTime,
      checkOutTime,
      companyPhone = '+91 9954363505, 7399888844, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com',
    } = variables;

    const inDate = TemplateHelper.formatDate(checkInDate, 'long');
    const outDate = TemplateHelper.formatDate(checkOutDate, 'long');

    const formattedCheckInTime = checkInTime ? TemplateHelper.formatTimeToAMPM(checkInTime) : 'N/A';
    const formattedCheckOutTime = checkOutTime ? TemplateHelper.formatTimeToAMPM(checkOutTime) : 'N/A';

    return [
      guestName,
      `${hotelName}, ${city}, ${state}`,
      bookingId,
      inDate,
      outDate,
      roomType,
      numberOfRooms,
      numberOfNights,
      totalAdults,
      totalChildren,
      originalAmount,
      advanceAmount,
      balanceAmount,
      'Any additional charges (meals, laundry, etc.) will be collected directly by the hotel.',
      googleMapsLink,
      formattedCheckInTime,
      formattedCheckOutTime,
      'Carry a valid ID at check-in.',
      'Ensure you have the necessary payment method for hotel charges.',
      companyPhone,
      companyEmail
    ]
  }
}

module.exports = DirectPaymentGuestModifiedTemplate;

