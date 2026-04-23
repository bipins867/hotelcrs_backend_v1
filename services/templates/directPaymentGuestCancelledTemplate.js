/**
 * Direct Payment (Pay-at-Hotel) Cancelled Reservation WhatsApp Template to Guest
 */

const TemplateHelper = require('../../utils/templateHelper');

class DirectPaymentGuestCancelledTemplate {
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
      googleMapsLink,
      companyPhone = '+91 9954363505, 7399888844, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com'
    } = variables;

    const inDate = TemplateHelper.formatDate(checkInDate, 'long');
    const outDate = TemplateHelper.formatDate(checkOutDate, 'long');

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
      'As per the terms & conditions hotel cancellation policy',
      googleMapsLink,
      'If you have any questions regarding this cancellation or refunds (if applicable), please contact us immediately.',
      'We recommend rebooking early to secure your preferred dates.',
      companyPhone,
      companyEmail
    ]
  }
}

module.exports = DirectPaymentGuestCancelledTemplate;

