/**
 * Next 7 Days Check-In Report WhatsApp Template for Hotels
 */

const TemplateHelper = require('../../utils/templateHelper');

class Next7DaysCheckInReportHotelTemplate {
  static format(variables) {
    const {
      hotelName,
      city,
      state,
      date,
      endDate,
      time,
      companyName = 'World Choice Hotels Pvt. Ltd.',
      companyAddress = 'Qutub Vihar, Phase 1, Sector 19 Dwarka, New Delhi – 110071',
      companyPhone = '+91 9954363505 | +91 9999880803 | +91 7399888844',
      companyEmailReservations = 'reservations@wchotels.com',
      companyEmailPartner = 'partner@wchotels.com'
    } = variables;

    const formattedDate = date ? TemplateHelper.formatDate(date, 'DDMMYYYY') : 'DDMMYY';
    const formattedEndDate = endDate ? TemplateHelper.formatDate(endDate, 'DDMMYYYY') : 'DDMMYY';
    const reportStartDate = date ? TemplateHelper.formatDate(date, 'short') : '';
    const reportEndDate = endDate ? TemplateHelper.formatDate(endDate, 'short') : '';

    return `📅 *NEXT 7 DAYS CHECK-IN REPORT - ${formattedDate}*\n\nDear Team,\n\nNamaste & Greetings from *World Choice Hotels!* 🌿\n\nPlease find attached your *Next 7 Days Check-In Report* generated automatically from the *CRS System* on *${formattedDate} at ${time}*.\n\n🏨 *Hotel:* ${hotelName}, ${city}, ${state}\n📅 *Report Duration:* ${reportStartDate} to ${reportEndDate}\n📎 *Attachment:* "Next 7 Days Check-In Report - ${hotelName} - ${formattedDate}, ${time}.pdf"\n\n▲ *Important Notes:*\n- This report includes all *upcoming check-ins for the next 7 days* (new, modified, and cancelled).\n- Please plan housekeeping, room allocation, and staff scheduling accordingly.\n- Cross-check rates, meal plans, and guest details to avoid discrepancies.\n- Ensure *GST invoices* are issued in the name of *World Choice Hotels Pvt. Ltd.* for all applicable bookings.\n\n📞 *For Assistance:*\nCall: ${companyPhone}\nEmail: ${companyEmailReservations} | ${companyEmailPartner}\n\nThank you for your timely coordination.\n\nWishing your team a productive week and happy guests! 🌿\n\n—\n*${companyName}*\n${companyAddress}`;
  }
}

module.exports = Next7DaysCheckInReportHotelTemplate;

