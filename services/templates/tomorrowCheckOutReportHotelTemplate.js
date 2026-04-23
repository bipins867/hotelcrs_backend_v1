/**
 * Tomorrow Check-Out Report WhatsApp Template for Hotels
 */

const TemplateHelper = require('../../utils/templateHelper');

class TomorrowCheckOutReportHotelTemplate {
  static format(variables) {
    const {
      hotelName,
      city,
      state,
      date,
      time,
      companyName = 'World Choice Hotels Pvt. Ltd.',
      companyAddress = 'Qutub Vihar, Phase 1, Sector 19 Dwarka, New Delhi – 110071',
      companyPhone = '+91 9954363505 | +91 9999880833 | +91 7399888844',
      companyEmailReservations = 'reservations@wchotels.com',
      companyEmailWeCare = 'wecare@wchotels.com',
      companyEmailAccounts = 'accounts@wchotels.com',
      gstInvoiceEmail1 = 'gstinvoices@wchotels.com',
      gstInvoiceEmail2 = 'accounts@wchotels.com'
    } = variables;

    const formattedDate = date ? TemplateHelper.formatDate(date, 'DDMMYYYY') : 'DDMMYY';

    return `🚪 *TOMORROW CHECK-OUT REPORT - ${formattedDate}*\n\nDear Team,\n\nNamaste & Greetings from *World Choice Hotels!* 👋\n\nPlease find attached your *Tomorrow Check-Out Report* for *${formattedDate}* — generated automatically from the *CRS System* at *${time}*.\n\n🏨 *Hotel:* ${hotelName}, ${city}, ${state}\n🗓️ *Date:* ${formattedDate}\n📎 *Attachment:* "Tomorrow Check-Out Report - ${hotelName}, ${city} - ${formattedDate}.pdf"\n\n⚠️ *Important Notes:*\n- Please review the list of guests *scheduled to check out tomorrow*.\n- Confirm *payments, billing, and GST invoices* are completed accurately.\n- Ensure *check-out timing, meal plans,* and *additional charges* (if any) are correctly updated in your PMS.\n- For early check-outs or stay reductions, please inform our reservations team immediately.\n- All *GST invoices* must be issued in the name of *World Choice Hotels Pvt. Ltd.* and uploaded via your *WorldCRS Login* or sent to:\n  • ${gstInvoiceEmail1} | ${gstInvoiceEmail2}\n\n📞 *For Assistance:*\nCall: ${companyPhone}\nEmail: ${companyEmailReservations} | ${companyEmailWeCare} | ${companyEmailAccounts}\n\nThank you for your cooperation and timely coordination.\n\nWishing your team smooth check-outs and happy guests! 😊\n\n—\n*${companyName}*\n${companyAddress}`;
  }
}

module.exports = TomorrowCheckOutReportHotelTemplate;

