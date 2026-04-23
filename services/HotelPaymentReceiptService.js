const EmailService = require('./EmailService');
const emailConfig = require('../config/email');
const fs = require('fs').promises;
const path = require('path');

class HotelPaymentReceiptService extends EmailService {
  
  /**
   * Send consolidated payment receipt to hotel for multiple payments
   * @param {Array} payments - Array of payment objects with full associations
   * @param {string} hotelEmail - Hotel email address
   * @param {Object} hotelInfo - Hotel information
   */
  static async sendConsolidatedPaymentReceipt(payments, hotelEmail, hotelInfo) {
    try {
      if (!payments || payments.length === 0) {
        throw new Error('No payments provided');
      }

      const subject = `Payment Receipt - ${payments.length} Booking${payments.length > 1 ? 's' : ''}`;
      const html = await this.generateConsolidatedReceiptHTML(payments, hotelInfo);
      
      return await EmailService.sendEmail({
        to: hotelEmail,
        subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send consolidated payment receipt to hotel: ${error.message}`);
    }
  }

  /**
   * Generate consolidated HTML receipt for multiple payments
   * @param {Array} payments - Array of payment objects
   * @param {Object} hotelInfo - Hotel information
   */
  static async generateConsolidatedReceiptHTML(payments, hotelInfo) {
    try {
      // Read the template file
      const templatePath = path.join(__dirname, '../templates/emails/hotel-payment-receipt.html');
      let template = await fs.readFile(templatePath, 'utf8');

      // Calculate totals and prepare data
      const totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const firstPayment = payments[0];
      const lastPayment = payments[payments.length - 1];

      // Format dates
      const formatDate = (date) => {
        const day = date.getDate();
        const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day}${suffix} ${month}, ${year}`;
      };

      // Generate booking rows
      const bookingRows = payments.map(payment => {
        const reservation = payment.reservation;
        const customer = reservation?.customers;
        
        // Get customer name
        const getCustomerName = () => {
          if (!customer?.name) return 'N/A';
          if (Array.isArray(customer.name)) {
            return customer.name[0] || 'N/A';
          }
          return customer.name;
        };

        const checkinDate = new Date(reservation.checkingDate);
        const checkoutDate = new Date(reservation.checkoutDate);

        return `
          <tr>
            <td style="border-color:#bfe3f9;text-align:center;padding:3px;font-size:11px;color:#2e6ab3;font-family:arial">${reservation.bookingId || 'N/A'}</td>
            <td style="border-color:#bfe3f9;text-align:center;padding:3px;font-size:11px;color:#2e6ab3;font-family:arial">${getCustomerName()}</td>
            <td style="border-color:#bfe3f9;text-align:center;padding:3px;font-size:11px;color:#2e6ab3;font-family:arial">${formatDate(checkinDate)}</td>
            <td style="border-color:#bfe3f9;text-align:center;padding:3px;font-size:11px;color:#2e6ab3;font-family:arial">${formatDate(checkoutDate)}</td>
            <td style="border-color:#bfe3f9;text-align:center;padding:3px;font-size:11px;color:#2e6ab3;font-family:arial">Rs. ${(payment.amount || 0).toLocaleString()}</td>
          </tr>
        `;
      }).join('');

      // Determine payment date (use the latest payment date)
      const paymentDate = new Date(Math.max(...payments.map(p => new Date(p.paymentDate))));

      // Determine mode of payment (if all are same, use that, otherwise show "Multiple")
      const modesOfPayment = [...new Set(payments.map(p => p.modeOfPayment))];
      const modeOfPayment = modesOfPayment.length === 1 ? modesOfPayment[0] : 'Multiple';

      // Determine bank reference (if all are same, use that, otherwise show "Multiple")
      const bankReferences = [...new Set(payments.map(p => p.bankReference))];
      const bankReference = bankReferences.length === 1 ? bankReferences[0] : 'Multiple';

      // Generate receipt number
      const receiptNumber = `REC${Date.now()}`;

      // Replace placeholders with actual data
      const replacements = {
        '{{receiptNumber}}': receiptNumber,
        '{{hotelName}}': hotelInfo?.name || 'N/A',
        '{{cityName}}': hotelInfo?.city?.name || 'N/A',
        '{{countryName}}': hotelInfo?.country?.name || 'N/A',
        '{{paymentDate}}': formatDate(paymentDate),
        '{{modeOfPayment}}': modeOfPayment || 'N/A',
        '{{totalAmount}}': totalAmount.toLocaleString(),
        '{{bankReference}}': bankReference || 'N/A',
        '{{accountNumber}}': emailConfig.accountNumber || 'N/A',
        '{{ifscCode}}': emailConfig.ifscCode || 'N/A',
        '{{bankName}}': emailConfig.bankName || 'N/A',
        '{{gstNumber}}': emailConfig.gstin || 'N/A',
        '{{bookingRows}}': bookingRows
      };

      // Apply all replacements
      Object.keys(replacements).forEach(key => {
        template = template.replace(new RegExp(key, 'g'), replacements[key]);
      });

      return template;
    } catch (error) {
      throw new Error(`Failed to generate consolidated receipt HTML: ${error.message}`);
    }
  }

  /**
   * Group payments by hotel for sending consolidated receipts
   * @param {Array} payments - Array of payment objects with full associations
   */
  static groupPaymentsByHotel(payments) {
    const hotelGroups = {};

    payments.forEach(payment => {
      const reservation = payment.reservation;
      const hotel = reservation?.hotels;
      
      if (hotel && hotel.id) {
        const hotelId = hotel.id;
        
        if (!hotelGroups[hotelId]) {
          hotelGroups[hotelId] = {
            hotel: hotel,
            payments: []
          };
        }
        
        hotelGroups[hotelId].payments.push(payment);
      }
    });

    return hotelGroups;
  }

  /**
   * Send payment receipts for all hotels in bulk payments
   * @param {Array} payments - Array of payment objects with full associations
   */
  static async sendBulkPaymentReceipts(payments) {
    try {
      const hotelGroups = this.groupPaymentsByHotel(payments);
      const results = [];

      for (const [hotelId, group] of Object.entries(hotelGroups)) {
        try {
          const hotel = group.hotel;
          const hotelEmail = this.extractEmail(hotel.email);
          
          if (hotelEmail) {
            await this.sendConsolidatedPaymentReceipt(group.payments, hotelEmail, hotel);
            results.push({
              hotelId,
              hotelName: hotel.name,
              email: hotelEmail,
              paymentCount: group.payments.length,
              status: 'success'
            });
          } else {
            results.push({
              hotelId,
              hotelName: hotel.name,
              email: null,
              paymentCount: group.payments.length,
              status: 'no_email'
            });
          }
        } catch (error) {
          results.push({
            hotelId,
            hotelName: group.hotel.name,
            email: this.extractEmail(group.hotel.email),
            paymentCount: group.payments.length,
            status: 'error',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to send bulk payment receipts: ${error.message}`);
    }
  }

  /**
   * Helper function to extract email from JSON/JSONB field
   * @param {any} emailField - Email field that might be string or array
   */
  static extractEmail(emailField) {
    if (!emailField) return null;
    if (Array.isArray(emailField)) {
      return emailField[0] || null;
    }
    return emailField;
  }
}

module.exports = HotelPaymentReceiptService; 