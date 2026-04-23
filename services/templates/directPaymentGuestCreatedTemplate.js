/**
 * Direct Payment (Pay-at-Hotel) Modified Reservation WhatsApp Template to Guest
 */

const TemplateHelper = require('../../utils/templateHelper');

class DirectPaymentGuestModifiedTemplate {
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
      balanceAmount,
      googleMapsLink,
      checkInTime,
      checkOutTime,
      companyPhone = '+91 9954363505, 7399888884, 9999880803',
      companyEmail = 'reservations@wchotels.com, info@wchotels.com',
      companyName = 'World Choice Hotels Pvt. Ltd.'
    } = variables;

    const inDate = TemplateHelper.formatDate(checkInDate, 'long');
    const outDate = TemplateHelper.formatDate(checkOutDate, 'long');

    return `🧾 *YOUR PAY-AT-HOTEL BOOKING IS CONFIRMED!*\n\nDear ${guestName},\n\nThank you for booking with *World Choice Hotels*! We are pleased to confirm your reservation. Please find your booking details below. *Please pay the outstanding amount at the time of check in*: \n\n🏨 *Hotel Name, City, State:* ${hotelName}, ${city}, ${state}\n🧾 *Booking ID:* ${bookingId}\n📅 *Check-in:* ${inDate}\n📅 *Check-out:* ${outDate}\n🛏️ *Room Type:* ${roomType}\n🚪 *Number of Rooms:* ${numberOfRooms}\n🌙 *Number of Nights:* ${numberOfNights}\n👥 *Guests:* ${totalAdults} Adults, ${totalChildren} Children\n\n💳 *Payment Details:*\n- *Original Amount:* ₹${originalAmount}\n- *Advance Paid (if any):* ₹${advanceAmount}\n- *Balance to be Paid at Hotel:* ₹${balanceAmount}\n- Any additional charges (meals, laundry, etc.) will be collected directly by the hotel.\n\n📍 *Hotel Location:* ${googleMapsLink ? googleMapsLink : 'N/A'}\n\n✅ *Important Information:*\n- Check-in time: ${checkInTime || ''}\n- Check-out time: ${checkOutTime || ''}\n- Carry a valid ID at check-in.\n- Ensure you have the necessary payment method for hotel charges.\n\n✉️ *Need Assistance?*\nCall: ${companyPhone}\nEmail: ${companyEmail}\n\nWe look forward to welcoming you and wish you a comfortable stay with *World Choice Hotels!* 🌿\n\n🌐 *${companyName}*`;
  }
}

module.exports = DirectPaymentGuestModifiedTemplate;


