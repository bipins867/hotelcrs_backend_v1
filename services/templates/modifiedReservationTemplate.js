/**
 * Modified Reservation WhatsApp Template
 */

const TemplateHelper = require('../../utils/templateHelper');

class ModifiedReservationTemplate {
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
      bookingAmount,
      companyPhone = '+91 9954363505 / 9999880803 / 7399888844',
      companyEmail = 'info@wchotels.com, reservations@wchotels.com'
    } = variables;

    const formattedCheckIn = checkInDate ? TemplateHelper.formatDate(checkInDate, 'long') : 'N/A';
    const formattedCheckOut = checkOutDate ? TemplateHelper.formatDate(checkOutDate, 'long') : 'N/A';

    return [
      `${hotelName}, ${city}, ${state}`,
      guestName,
      bookingId,
      formattedCheckIn,
      formattedCheckOut,
      roomType,
      numberOfRooms,
      numberOfNights,
      totalAdults,
      totalChildren,
      bookingAmount,
      companyPhone,
      companyEmail
    ];
  }
}

module.exports = ModifiedReservationTemplate;


