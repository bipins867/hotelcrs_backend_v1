/**
 * Direct Payment (Pay-at-Hotel) Modified Reservation WhatsApp Template to Hotel
 */

const TemplateHelper = require('../../utils/templateHelper');

class DirectPaymentHotelModifiedTemplate {
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
      'Update your records with the modified reservation details.',
      'Collect full room charges and applicable taxes from the guest at check-in.',
      'Collect any additional charges such as meals, laundry, or extra services directly from the guest.',
      'Maintain professional communication and confidentiality of rates.',
      'Ensure the room is ready for guest arrival.',
      companyPhone,
      companyEmail
    ]
  }
}

module.exports = DirectPaymentHotelModifiedTemplate;


