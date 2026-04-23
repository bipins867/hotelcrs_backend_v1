/**
 * Guest Cancelled Reservation WhatsApp Template
 */

const TemplateHelper = require('../../utils/templateHelper');

class CancelledReservationGuestTemplate {
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
      googleMapsLink,
      companyPhone = '+91 9954363505, 7399888884, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com'
    } = variables;

    const formattedCheckIn = checkInDate ? TemplateHelper.formatDate(checkInDate, 'long') : 'N/A';
    const formattedCheckOut = checkOutDate ? TemplateHelper.formatDate(checkOutDate, 'long') : 'N/A';

    return [
      guestName,
      `${hotelName}, ${city}, ${state}`,
      bookingId,
      formattedCheckIn,
      formattedCheckOut,
      roomType,
      numberOfRooms,
      numberOfNights,
      totalAdults,
      totalChildren,
      googleMapsLink,
      companyPhone,
      companyEmail
    ];
  }
}

module.exports = CancelledReservationGuestTemplate;


