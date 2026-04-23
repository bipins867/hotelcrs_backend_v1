/**
 * Direct Payment (Pay-at-Hotel) Cancellation WhatsApp Template to Hotel
 */

const TemplateHelper = require('../../utils/templateHelper');

class DirectPaymentHotelCancelledTemplate {
  static format(variables) {
    const {
      hotelName,
      city,
      state,
      guestName,
      bookingId,
      checkInDate,
      checkOutDate,
      roomType,
      numberOfRooms,
      numberOfNights,
      totalAdults,
      totalChildren,
      advanceAmount,
      finalAmount,
      companyPhone = '+91 9954363505 / 7399888884 / 9999880803',
      companyEmail = 'info@wchotels.com, reservations@wchotels.com',
      companyName = 'World Choice Hotels Pvt. Ltd.'
    } = variables;

    const inDate = TemplateHelper.formatDate(checkInDate, 'long');
    const outDate = TemplateHelper.formatDate(checkOutDate, 'long');

    return [
      'team',
      `${hotelName}, ${city}, ${state}`,
      guestName,
      bookingId,
      inDate,
      outDate,
      roomType,
      numberOfRooms,
      numberOfNights,
      totalAdults,
      totalChildren,
      advanceAmount,
      finalAmount,
      'This booking is *cancelled*. Please release the rooms immediately.',
      'Do not collect any payment from the guest.',
      'Maintain professional communication and confidentiality of rates.',
      'Update your records and ensure room inventory is available for other reservations.',
      companyPhone,
      companyEmail
    ]
  }
}

module.exports = DirectPaymentHotelCancelledTemplate;


