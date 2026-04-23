/**
 * Guest Check-In Reminder WhatsApp Template
 */

const TemplateHelper = require('../../utils/templateHelper');

class CheckinReminderGuestTemplate {
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
      companyPhone = '+91 9954363505, 7399888884, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com'
    } = variables;

    const formattedCheckIn = checkInDate ? TemplateHelper.formatDate(checkInDate, 'long') : 'N/A';
    const formattedCheckOut = checkOutDate ? TemplateHelper.formatDate(checkOutDate, 'long') : 'N/A';
    const formattedCheckinTime = checkInTime ? TemplateHelper.formatTimeToAMPM(checkInTime) : '12 PM';

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
      googleMapsLink,
      formattedCheckinTime,
      companyPhone,
      companyEmail
    ];
  }
}

module.exports = CheckinReminderGuestTemplate;


