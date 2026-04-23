/**
 * New Booking WhatsApp Template
 * Template for "NEW BOOKING RECEIVED!" notification to hotel
 */

const TemplateHelper = require('../../utils/templateHelper');

class NewBookingTemplate {
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

    // Format check-in and check-out dates
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

module.exports = NewBookingTemplate;

