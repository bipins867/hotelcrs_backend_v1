/**
 * Direct Payment (Pay-at-Hotel) WhatsApp Template to Hotel
 */

const TemplateHelper = require('../../utils/templateHelper');

class DirectPaymentHotelTemplate {
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
      'Collect full room charges and applicable taxes from the guest at check-in.',
      'Collect any additional charges such as meals, laundry, or extra services directly from the guest.',
      'Maintain professional communication and confidentiality of rates.',
      'Ensure the room is ready for guest arrival.',
      companyPhone,
      companyEmail
    ]
  }
}

module.exports = DirectPaymentHotelTemplate;


