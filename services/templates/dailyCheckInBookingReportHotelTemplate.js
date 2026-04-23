/**
 * Daily Check-In & Booking Report WhatsApp Template for Hotels
 */

const TemplateHelper = require('../../utils/templateHelper');

class DailyCheckInBookingReportHotelTemplate {
  static format(variables) {
    const {
      hotelName,
      city,
      state,
      date,
      time,
      companyName = 'World Choice Hotels Pvt. Ltd.',
      companyAddress = 'Qutub Vihar, Phase 1, Sector 19 Dwarka, New Delhi – 110071',
      companyPhone = '+91 9954363505, +91 9999880803, +91 7399888844',
      companyEmailReservations = 'reservations@wchotels.com',
      companyEmailPartner = 'partner@wchotels.com',
      gstInvoiceEmail1 = 'gstinvoices@wchotels.com',
      gstInvoiceEmail2 = 'accounts@wchotels.com'
    } = variables;

    const formattedDate = date ? TemplateHelper.formatDate(date, 'DDMMYYYY') : 'DDMMYY';

    return `📊 *TODAYS CHECK-IN & BOOKING REPORT - ${formattedDate}*\n\nDear Team,\n\nYour *Daily Check-In & Booking Report* for *${formattedDate}* has been generated automatically from our *CRS System* at *${time}* and sent to your email.\n\n🏨 *Hotel Information:*\n- *Hotel Name:* ${hotelName}\n- *City:* ${city}\n- *State:* ${state}\n\n📅 *Date:* ${formattedDate}\n\n▲ *Important Notes:*\n- Please check *Today's Check-In, New/Modified, and Cancelled Bookings* carefully.\n- Cross-verify and update your front desk or PMS system accordingly.\n- All *GST invoices* must be issued in the name of *World Choice Hotels Pvt. Ltd.* as per your hotel's state GSTIN.\n- Upload invoices after guest check-out via your *WorldCRS Login* or send to:\n  • ${gstInvoiceEmail1}\n  • ${gstInvoiceEmail2}\n\n📞 *For Assistance:*\nCall: ${companyPhone}\nEmail: ${companyEmailReservations} | ${companyEmailPartner}\n\nThank you for your cooperation. We wish you smooth check-ins and happy guests! 😊\n\n🌐 *${companyName}*\n${companyAddress}`;
  }
}

module.exports = DailyCheckInBookingReportHotelTemplate;

