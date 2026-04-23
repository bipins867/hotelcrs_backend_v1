/**
 * Guest Booking Confirmation WhatsApp Template
 */

const TemplateHelper = require('../../utils/templateHelper');

class BookingConfirmationGuestTemplate {
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
      checkInTime,
      checkOutTime,
      companyPhone = '+91 9954363505, 7399888884, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com'
    } = variables;

    const formattedCheckIn = checkInDate ? TemplateHelper.formatDate(checkInDate, 'weekday-short') : 'N/A';
    const formattedCheckOut = checkOutDate ? TemplateHelper.formatDate(checkOutDate, 'weekday-short') : 'N/A';

    const formattedCheckInTime = checkInTime ? TemplateHelper.formatTimeToAMPM(checkInTime) : 'N/A';
    const formattedCheckOutTime = checkOutTime ? TemplateHelper.formatTimeToAMPM(checkOutTime) : 'N/A';

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
      formattedCheckInTime,
      formattedCheckOutTime,
      companyPhone,
      companyEmail
    ];
  }
}

module.exports = BookingConfirmationGuestTemplate;


