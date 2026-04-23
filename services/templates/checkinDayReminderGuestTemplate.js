/**
 * Guest Check-In Day Reminder WhatsApp Template
 * Used for sending reminders on the check-in day itself
 */

const TemplateHelper = require('../../utils/templateHelper');

class CheckinDayReminderGuestTemplate {
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
      companyPhone = '+91 9954363505, 7399888844, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com'
    } = variables;

    const formattedCheckIn = checkInDate ? TemplateHelper.formatDate(checkInDate, 'long') : 'N/A';
    const formattedCheckOut = checkOutDate ? TemplateHelper.formatDate(checkOutDate, 'long') : 'N/A';

    const formattedCheckInTime = checkInTime ? TemplateHelper.formatTimeToAMPM(checkInTime) : 'N/A';
    
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
      companyPhone,
      companyEmail
    ];

  }
}

module.exports = CheckinDayReminderGuestTemplate;

