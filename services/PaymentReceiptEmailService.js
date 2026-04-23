const EmailService = require('./EmailService');
const emailConfig = require('../config/email');
const fs = require('fs').promises;
const path = require('path');
const { getCompanyDetails } = require('../utils/common');
const { getGstAmount } = require('../helper/reservation');

class PaymentReceiptEmailService extends EmailService {

  /**
   * Convert static logo file to base64 data URI
   * @returns {Promise<string>} Base64 data URI
   */
  static async getCompanyLogoBase64() {
    try {
      return [{
        filename: "company-logo.png",
        path: path.join(__dirname, "../public/images/company-logo.png"),
        cid: "companylogo",
      }];
    } catch (error) {
      console.error('Error reading company logo:', error);
      return null;
    }
  }

  /**
   * Format date for display
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Send payment receipt email based on payment type
   * @param {Object} payment - Payment object with full associations
   * @param {string} recipientEmail - Recipient email address
   * @param {string} paymentType - Type of payment (e.g., 'customer', 'hotel', 'admin')
   */
  static async sendPaymentReceipt(payment, recipientEmail, paymentType = 'customer') {
    try {
      if (!payment) {
        throw new Error('Payment data is required');
      }

      if (!recipientEmail) {
        throw new Error('Recipient email is required');
      }

      const subject = this.getEmailSubject(payment, paymentType);
      const html = await this.generatePaymentReceiptHTML(payment, paymentType);

      return await EmailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
      });
    } catch (error) {
      throw new Error(`Failed to send payment receipt: ${error.message}`);
    }
  }

  /**
   * Get email subject based on payment type
   * @param {Object} payment - Payment object
   * @param {string} paymentType - Type of payment
   */
  static getEmailSubject(payment, paymentType) {
    const reservation = payment.reservation;
    const bookingId = reservation?.bookingId || 'N/A';
    const customerName = Array.isArray(reservation?.customers?.name)
      ? (reservation?.customers?.name?.[0] || 'Guest')
      : (reservation?.customers?.name || 'Guest');
    const receiptNumber = (payment?.receipt && (payment.receipt.number || payment.receipt.receiptNumber))
      ? (payment.receipt.number || payment.receipt.receiptNumber)
      : payment.id;
    const paymentDate = (() => {
      const d = new Date(payment.paymentDate || payment.createdAt);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    })();

    switch (paymentType) {
      case 'customer':
        return `Confirmation of Payment for "${customerName}"- # ${receiptNumber}, Booking ID:${bookingId}, ${paymentDate}`;
      case 'hotel':
        {
          const hotelName = reservation?.hotels?.name || 'Hotel';
          const city = reservation?.hotels?.city?.name || '';
          const state = reservation?.hotels?.state?.name || '';
          // Example: Payment Confirmation for Multiple Bookings – Hotel Nandan, Guwahati, Assam, 02.10.2025
          return `Payment Confirmation for Bookings – ${hotelName}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}, ${paymentDate}`;
        }
      case 'admin':
        return `Confirmation of Payment for "${customerName}"- # ${receiptNumber}, Booking ID:${bookingId}, ${paymentDate}`;
      default:
        return `Payment Receipt - Booking ID: ${bookingId}`;
    }
  }

  /**
   * Generate payment receipt HTML based on payment type
   * @param {Object} payment - Payment object with full associations
   * @param {string} paymentType - Type of payment
   */
  static async generatePaymentReceiptHTML(payment, paymentType) {
    try {
      // Select template based on payment type
      let templateFileName;
      switch (paymentType) {
        case 'customer':
          templateFileName = 'customer-payment-receipt.html';
          break;
        case 'hotel':
          templateFileName = 'hotel-payment-voucher.html';
          break;
        case 'admin':
          templateFileName = 'payment-receipt.html';
          break;
        default:
          templateFileName = 'customer-payment-receipt.html';
          break;
      }

      // Read the template file
      const templatePath = path.join(__dirname, '../templates/emails', templateFileName);
      let template = await fs.readFile(templatePath, 'utf8');

      const reservation = payment.reservation;
      const customer = reservation?.customers;
      const hotel = reservation?.hotels;
      const bookingDetails = reservation?.bookingDetails;
      const paymentTypes = reservation?.paymentTypes;

      // Get customer name
      const getCustomerName = () => {
        if (!customer?.name) return 'N/A';
        if (Array.isArray(customer.name)) {
          return customer.name[0] || 'N/A';
        }
        return customer.name;
      };

      // Get customer phone
      const getCustomerPhone = () => {
        if (!customer?.mobile) return 'N/A';
        if (Array.isArray(customer.mobile)) {
          return customer.mobile[0] || 'N/A';
        }
        return customer.mobile;
      };

      // Get customer email
      const getCustomerEmail = () => {
        if (!customer?.email) return 'N/A';
        if (Array.isArray(customer.email)) {
          return customer.email[0] || 'N/A';
        }
        return customer.email;
      };

      // Get hotel location
      const getHotelLocation = () => {
        if (!hotel) return 'N/A';
        const parts = [];
        if (hotel.city?.name) parts.push(hotel.city.name);
        if (hotel.state?.name) parts.push(hotel.state.name);
        if (hotel.country?.name) parts.push(hotel.country.name);
        return parts.join(', ') || 'N/A';
      };

      // Get payment mode
      const getPaymentMode = () => {
        if (!payment.modeOfPayment) return 'N/A';
        if (payment.modeOfPayment.toLowerCase().includes('razorpay')) {
          return 'Payment Gateway - Razorpay';
        }
        return payment.modeOfPayment;
      };

      // Get payment status
      const getPaymentStatus = () => {
        if (!payment.status) return 'Captured';
        return payment.status;
      };

      // Get company details (no need for S3 URLs since we're using static logo)
      const companyDetails = await getCompanyDetails({ includeSignedUrls: false });

      // Get company logo as base64
      const companyLogoBase64 = await this.getCompanyLogoBase64();

      // Convert amount to words
      const amountInWords = this.convertAmountToWords(payment.amount || 0);

      // Calculate payment breakup for received payment type
      const getPaymentBreakup = () => {
        const totalAmount = payment.amount || 0;
        // These are example calculations - adjust based on your business logic
        const accommodationCharges = getGstAmount(reservation?.oldData?.companyDetails, totalAmount); // 70% for accommodation
        const gstTaxes = Math.round(getGstAmount(reservation?.oldData?.companyDetails, totalAmount)); // 18% GST
        const serviceFee = Math.round(getGstAmount(reservation?.oldData?.companyDetails, totalAmount)); // 12% service fee

        return {
          accommodationCharges: `₹${accommodationCharges.toLocaleString('en-IN')}`,
          gstTaxes: `₹${gstTaxes.toLocaleString('en-IN')}`,
          serviceFee: `₹${serviceFee.toLocaleString('en-IN')}`,
          totalAmount: `₹${totalAmount.toLocaleString('en-IN')}`
        };
      };

      const paymentBreakup = getPaymentBreakup();

      // Generate invoice number
      const invoiceNumber = reservation?.pnr;

      // Get hotel bank details for hotel payment voucher
      const getHotelBankDetails = () => {
        const hotel = reservation?.hotels?.financialInformation;
        if (!hotel) return {};

        return {
          accountNumber: hotel?.accountNumber,
          ifscCode: hotel?.ifscCode,
          accountName: hotel?.beneficiaryName,
          bankName: hotel?.bankName,
          gstNumber: hotel?.gstNumber,
          swiftCode: hotel?.swiftCode
        };
      };

      const hotelBankDetails = getHotelBankDetails();

      // Format dates for checkin/checkout
      const formatDateForDisplay = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${month} ${day}, ${year}`;
      };

      // Derive additional values required by templates inspired by the new format
      const receiptNumber = payment?.invoiceNumber || 'NA';
      const paymentRef = payment?.upi || payment?.bankReference || 'NA';
      const chequeNo = (payment?.modeOfPayment === 'Cheque') ? (payment?.bankReference || 'NA') : 'NA';
      const amountPaid = `INR ${(payment.amount || 0).toLocaleString('en-IN')}`;
      const reservationNumber = reservation?.bookingId || 'N/A';
      const wchRefNo = reservation?.pnr || 'N/A';
      const numRooms = reservation?.totalRooms || 'N/A';
      const numNights = reservation?.totalNight || 'N/A';
      const adultsChildren = `${reservation?.totalAdults || 0} Adults/ ${reservation?.totalChildren || 0} Child`;
      const roomType = bookingDetails?.map((row) => row?.rooms?.roomName).join(', ') || 'N/A';
      const mealPlan = bookingDetails?.map((row) => row?.ratePlans?.name).join(', ') || 'N/A';
      const bookingType = paymentTypes?.name || 'N/A';

      // Replace placeholders with actual data
      const replacements = {
        '{{bookingId}}': reservation?.bookingId || 'N/A',
        '{{invoiceNumber}}': invoiceNumber,
        '{{paymentDate}}': this.formatDate(payment.paymentDate || payment.createdAt),
        '{{transactionDateShort}}': (() => {
          const d = new Date(payment.paymentDate || payment.createdAt);
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          return `${day}.${month}.${year}`;
        })(),
        '{{customerName}}': getCustomerName(),
        '{{customerPhone}}': getCustomerPhone(),
        '{{customerEmail}}': getCustomerEmail(),
        '{{hotelName}}': hotel?.name || 'N/A',
        '{{hotelLocation}}': getHotelLocation(),
        '{{transactionDate}}': this.formatDate(payment.paymentDate || payment.createdAt),
        '{{paymentMode}}': getPaymentMode(),
        '{{paymentStatus}}': getPaymentStatus(),
        '{{transactionAmount}}': `₹${(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        '{{grandTotal}}': `₹${(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        '{{bankReference}}': payment.bankReference || 'N/A',
        '{{gstNumber}}': payment?.reservation?.hotels?.state?.gstDetails?.[0]?.gstNumber,
        '{{gstName}}': payment?.reservation?.hotels?.state?.gstDetails?.[0]?.gstHolderName,
        '{{gstAddress}}': payment?.reservation?.hotels?.state?.gstDetails?.[0]?.gstAddress,
        '{{amountInWords}}': amountInWords,
        '{{companyName}}': companyDetails.companyName,
        '{{companyAddress}}': companyDetails.address,
        '{{companyPhone}}': companyDetails?.phones?.map((row) => row?.phone).join(', ') || '',
        '{{companyEmail}}': companyDetails?.emails?.join(', ') || '',
        '{{companyLogo}}': companyLogoBase64 || '',
        // Payment breakup for received payment template
        '{{accommodationCharges}}': paymentBreakup.accommodationCharges,
        '{{gstTaxes}}': paymentBreakup.gstTaxes,
        '{{serviceFee}}': paymentBreakup.serviceFee,
        '{{totalAmount}}': paymentBreakup.totalAmount,
        // Hotel address for received payment template
        '{{hotelAddress}}': hotel?.address || 'N/A',
        // Hotel bank details for hotel payment voucher
        '{{hotelAccountNumber}}': hotelBankDetails.accountNumber,
        '{{hotelIfscCode}}': hotelBankDetails.ifscCode,
        '{{hotelAccountName}}': hotelBankDetails.accountName,
        '{{hotelBankName}}': hotelBankDetails.bankName,
        '{{hotelSwiftCode}}': hotelBankDetails.swiftCode || 'N/A',
        '{{hotelGstNumber}}': hotelBankDetails.gstNumber,
        // Checkin/checkout dates for hotel voucher
        '{{checkinDate}}': formatDateForDisplay(reservation?.checkingDate),
        '{{checkoutDate}}': formatDateForDisplay(reservation?.checkoutDate),
        // Transaction amount formatted for hotel voucher
        '{{transactionAmountFormatted}}': (payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        // New placeholders for customer receipt revamp
        '{{receiptNumber}}': receiptNumber,
        '{{paymentRefNo}}': paymentRef,
        '{{chequeNo}}': chequeNo,
        '{{amountPaid}}': amountPaid,
        '{{remarks}}': payment?.remark || 'NA',
        '{{note}}': payment?.note || 'NA',
        '{{reservationNo}}': reservationNumber,
        '{{wchRefNo}}': wchRefNo,
        '{{checkInDateDots}}': formatDateForDisplay(reservation?.checkingDate),
        '{{checkOutDateDots}}': formatDateForDisplay(reservation?.checkoutDate),
        '{{roomType}}': roomType,
        '{{bookingType}}': bookingType,
        '{{mealPlan}}': mealPlan,
        '{{numRooms}}': numRooms,
        '{{numNights}}': numNights,
        '{{adultsChildren}}': adultsChildren
      };

      // Apply all replacements
      Object.keys(replacements).forEach(key => {
        template = template.replace(new RegExp(key, 'g'), replacements[key]);
      });

      return template;
    } catch (error) {
      throw new Error(`Failed to generate payment receipt HTML: ${error.message}`);
    }
  }

  /**
   * Convert amount to words (Indian numbering system)
   * @param {number} amount - Amount to convert
   */
  static convertAmountToWords(amount) {
    if (amount === 0) return 'INR Zero Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    const convertHundreds = (num) => {
      let result = '';
      if (num > 99) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num > 19) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num > 9) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };

    let result = 'INR ';
    let scaleIndex = 0;
    let num = Math.floor(amount);

    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        const chunkWords = convertHundreds(chunk);
        if (scaleIndex > 0) {
          result = chunkWords + scales[scaleIndex] + ' ' + result;
        } else {
          result = chunkWords + result;
        }
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    // Handle decimal part
    const decimal = Math.round((amount % 1) * 100);
    if (decimal > 0) {
      result += ' and ' + convertHundreds(decimal) + 'Paise';
    }

    return result.trim() + ' Only';
  }

  /**
   * Send payment receipt to customer
   * @param {Object} payment - Payment object with full associations
   */
  static async sendToCustomer(payment) {
    try {
      const reservation = payment.reservation;
      const customer = reservation?.customers;

      if (!customer) {
        throw new Error('Customer information not found');
      }

      const customerEmail = this.extractEmail(customer.email);
      if (!customerEmail) {
        throw new Error('Customer email not found');
      }

      return await this.sendPaymentReceipt(payment, customerEmail, 'customer');
    } catch (error) {
      throw new Error(`Failed to send payment receipt to customer: ${error.message}`);
    }
  }

  /**
   * Send payment receipt to hotel
   * @param {Object} payment - Payment object with full associations
   */
  static async sendToHotel(payment) {
    try {
      const reservation = payment.reservation;
      const hotel = reservation?.hotels;

      if (!hotel) {
        throw new Error('Hotel information not found');
      }

      const hotelEmail = this.extractEmail(hotel.email);
      if (!hotelEmail) {
        throw new Error('Hotel email not found');
      }

      return await this.sendPaymentReceipt(payment, hotelEmail, 'hotel');
    } catch (error) {
      throw new Error(`Failed to send payment receipt to hotel: ${error.message}`);
    }
  }

  /**
   * Send payment receipt to admin
   * @param {Object} payment - Payment object with full associations
   * @param {string} adminEmail - Admin email address
   */
  static async sendToAdmin(payment, adminEmail) {
    try {
      if (!adminEmail) {
        throw new Error('Admin email is required');
      }

      return await this.sendPaymentReceipt(payment, adminEmail, 'admin');
    } catch (error) {
      throw new Error(`Failed to send payment receipt to admin: ${error.message}`);
    }
  }

  /**
   * Send payment receipts based on payment type
   * @param {Object} payment - Payment object with full associations
   * @param {string} paymentType - Type of payment to determine recipients
   */
  static async sendPaymentReceiptsByType(paymentData, paymentType) {
    try {
      const results = [];
      const payments = paymentData?.toJSON ? paymentData?.toJSON() : paymentData;
      const { oldData: { customers, hotels, bookingDetails, paymentTypes } } = payments?.reservation || {};

      const payment = {
        ...payments,
        reservation: {
          ...payments.reservation,
          customers: customers,
          bookingDetails: bookingDetails,
          paymentTypes: paymentTypes,
          hotels: {
            ...hotels,
            financialInformation: hotels.financialInformation,
            state: hotels.state,
            city: hotels.city,
            country: hotels.country
          }
        },
      }

      // Send to hotel based on payment type
      if (paymentType === 'Paid') {
        try {
          const hotelResult = await this.sendToHotel(payment);
          results.push({
            recipient: 'hotel',
            email: this.extractEmail(hotels?.email),
            status: 'success',
            messageId: hotelResult.messageId
          });
        } catch (error) {
          results.push({
            recipient: 'hotel',
            email: this.extractEmail(hotels?.email),
            status: 'error',
            error: error.message
          });
        }
      }

      // Send to admin for certain payment types
      if (paymentType === 'Received') {
        try {
          const customerResult = await this.sendToCustomer(payment);
          results.push({
            recipient: 'customer',
            email: this.extractEmail(customers?.email),
            status: 'success',
            messageId: customerResult.messageId
          });
        } catch (error) {
          results.push({
            recipient: 'customer',
            email: this.extractEmail(customers?.email),
            status: 'error',
            error: error.message
          });
        }
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to send payment receipts by type: ${error.message}`);
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

module.exports = PaymentReceiptEmailService;
