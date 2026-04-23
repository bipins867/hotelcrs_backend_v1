const fs = require('fs').promises;
const path = require('path');
const { PAYMENT_TYPE_OPTIONS } = require('./helper');
const { getCompanyDetails } = require('./common');
const { getGstAmount } = require('../helper/reservation');

class TemplateHelper {
  /**
   * Load HTML template from file
   * @param {string} templateName - Name of the template file (without extension)
   * @returns {Promise<string>} HTML template content
   */
  static async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      return templateContent;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found or could not be loaded`);
    }
  }

  /**
   * Replace placeholders in template with actual values
   * @param {string} template - HTML template content
   * @param {Object} data - Data object with key-value pairs for replacement
   * @returns {string} Processed HTML content
   */
  static processTemplate(template, data) {
    let processedTemplate = template;

    // Replace all placeholders with actual values
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = data[key] || '';
      processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
    });

    return processedTemplate;
  }

  /**
   * Load and process template with data
   * @param {string} templateName - Name of the template file (without extension)
   * @param {Object} data - Data object with key-value pairs for replacement
   * @returns {Promise<string>} Processed HTML content
   */
  static async loadAndProcessTemplate(templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      return this.processTemplate(template, data);
    } catch (error) {
      console.error(`Error processing template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Build a Google Maps link based on hotel coordinates or stored map URL
   * Falls back to address/name if coordinates or map URL are missing
   * @param {Object} hotel - Hotel object
   * @returns {string} Google Maps URL
   */
  static getGoogleMapsLink(hotel) {
    if (!hotel) return '#';
    const lat = hotel.latitude;
    const lng = hotel.longitude;
    if (lat && lng) {
      return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
    }
    if (hotel.map) {
      return hotel.map;
    }
    const address = hotel.address || '';
    const name = hotel.name || '';
    const cityName = hotel.city?.name || '';
    const query = address || `${name} ${cityName}`.trim();
    if (!query) return '#';
    return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
  }

  /**
   * Generate room details HTML table rows
   * @param {Array} bookingDetails - Array of booking detail objects
   * @returns {string} HTML table rows
   */
  static generateRoomDetailsHTML(bookingDetails, isAdmin = false, isHotel = false, isCustomer = false) {
    if (!Array.isArray(bookingDetails) || bookingDetails.length === 0) {
      return '<tr><td colspan="8" style="text-align: center;">No room details available</td></tr>';
    }

    return bookingDetails.map((detail, index) => {
      // Map fields based on frontend RoomDetails component structure
      const roomName = detail.rooms?.roomName || detail.rooms?.name || 'N/A';
      const planName = detail.ratePlans?.name || 'N/A';
      const adultCount = detail.totalAdults || detail.adultCount || 0;
      const childCount = detail.totalChild || detail.childCount || 0;
      const childAge = Array.isArray(detail.childAge) ? detail.childAge.join(', ') : (detail.childAge || 'N/A');
      const extraBed = detail.extraBed || 0;
      const nettAmount = parseFloat(detail.netAmount || detail.nettAmount) || 0;
      const netPayableAmt = Number(detail.payableAmount || 0).toFixed(2);

      return `
        <tr>
          <td style="padding: 8px;">${index + 1}</td>
          <td style="padding: 8px;">${roomName}</td>
          <td style="padding: 8px;">${planName}</td>
          <td style="padding: 8px;">${adultCount}</td>
          <td style="padding: 8px;">${childCount}</td>
          <td style="padding: 8px;">${childAge}</td>
          <td style="padding: 8px;">${extraBed}</td>
          <td style="padding: 8px;">${(isHotel || isAdmin) ? netPayableAmt : nettAmount.toLocaleString()}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Format date to locale string
   * @param {string|Date} date - Date to format
   * @param {string} format - Format type ('short', 'long', 'default')
   * @returns {string} Formatted date string
   */
  static formatDate(date, format = 'default') {
    if (!date) return 'N/A';

    const dateObj = new Date(date);

    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      case 'weekday-short':
        return dateObj.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      case 'short':
        return dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      case 'DDMMYYYY':
        {
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = String(dateObj.getFullYear());
          return `${day}-${month}-${year}`;
        }
      default:
        return dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
    }
  }

  static formatTimeToAMPM(time) {
    if (!time) return 'N/A';

    // Expecting time in "HH:mm:ss"
    const [hourStr] = time.split(':');
    let hours = Number(hourStr);

    if (isNaN(hours)) return 'N/A';

    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours} ${period}`;
  }
  /**
   * Prepare common data for email templates
   * @param {Object} reservation - Reservation data
   * @param {Object} emailConfig - Email configuration
   * @returns {Object} Prepared data object
   */
  static async prepareCommonData(reservation, isAdmin = false, isHotel = false, isCustomer = false) {
    const {
      bookingId,
      pnr,
      checkingDate,
      checkoutDate,
      totalNight,
      totalRooms,
      totalAdults,
      totalChildren,
      netAmt,
      saleAmt,
      advance,
      balance,
      bookingDetails = [],
      hotels: hotel,
      customers: customer,
      paymentTypes,
      status,
      createdAt,
      updatedAt,
      hotelNote,
      adminNote,
      customerNote,
      otaCommission,
      createdBy
    } = reservation;

    // Format dates
    const checkInDate = this.formatDate(checkingDate);
    const checkOutDate = this.formatDate(checkoutDate);
    const bookingDate = this.formatDate(createdAt || new Date());
    const modifiedDate = updatedAt ? this.formatDate(updatedAt) : 'N/A';

    // Get hotel contact info
    const hotelPhone = hotel?.phone || 'N/A';
    const hotelEmails = hotel?.email ? (Array.isArray(hotel.email) ? hotel.email.join(', ') : hotel.email) : 'N/A';
    const hotelName = hotel?.name || 'N/A';
    const hotelCity = hotel?.city?.name || 'N/A';
    const hotelState = hotel?.state?.name || 'N/A';
    const hotelGstNumber = hotel?.state?.gstDetails?.[0]?.gstNumber || 'N/A';
    const hotelGstHolderName = hotel?.state?.gstDetails?.[0]?.gstHolderName || 'N/A';
    const hotelGstAddress = hotel?.state?.gstDetails?.[0]?.gstAddress || 'N/A';

    // Get customer info
    const customerName = customer?.name || 'N/A';
    const customerEmails = customer?.email ? (Array.isArray(customer.email) ? customer.email.join(', ') : customer.email) : 'N/A';
    const customerPhone = customer?.phone || 'N/A';

    // Calculate amounts
    const totalAmount = parseFloat(saleAmt) || 0;
    const advanceAmount = parseFloat(advance) || 0;
    const balanceAmount = parseFloat(balance) || 0;
    const netAmount = parseFloat(netAmt) || 0;
    const commission = totalAmount - netAmount;

    // Financial calculations based on frontend FinancialInformation component
    const netAmountForHotel = getGstAmount(reservation?.oldData?.companyDetails, netAmount);
    const gstAmountForHotel = getGstAmount(reservation?.oldData?.companyDetails, netAmountForHotel);
    const nettPayableToHotel = netAmountForHotel + gstAmountForHotel;
    const wchBalance = totalAmount - netAmount;
    const advPayment = advanceAmount;
    const paidBalance = wchBalance - advPayment;

    // Generate room details HTML
    const roomDetailsHTML = this.generateRoomDetailsHTML(bookingDetails, isAdmin, isHotel, isCustomer);

    // Calculate grand total from booking details
    const grandTotal = bookingDetails.reduce((total, detail) => {
      return total + (parseFloat(detail.netAmount || detail.nettAmount) || 0);
    }, 0);

    // Generate source ID if not provided
    const sourceId = pnr;

    // Payment type information
    const paymentTypeName = paymentTypes?.name;
    const bookingType = paymentTypeName;

    // Status information
    const reservationStatus = status;

    // Generate reservation title and color based on payment type and status
    let reservationTitle = '';
    let titleColor = '';

    if (paymentTypes?.name === PAYMENT_TYPE_OPTIONS.DIRECT_PAYMENT) {
      reservationTitle = 'Pay At Hotel Reservation';
      titleColor = 'orange';
    } else if (paymentTypes?.name === PAYMENT_TYPE_OPTIONS.BILL_TO_COMPANY) {
      reservationTitle = 'Pre-Pay Reservation';
      titleColor = '#b0dc7d';
    } else if (paymentTypes?.name === PAYMENT_TYPE_OPTIONS.CANCELLED_BOOKING) {
      reservationTitle = 'Reservation Cancellation';
      titleColor = '#f53c3c';
    } else if (paymentTypes?.name === PAYMENT_TYPE_OPTIONS.NO_SHOW_BOOKING) {
      reservationTitle = 'No-Show Reservation';
      titleColor = '#yellow';
    }

    if (status === 'Cancel') {
      reservationTitle = 'Reservation Cancellation';
      titleColor = '#f53c3c';
    } else if (status === 'Modified') {
      reservationTitle = 'Modified Reservation';
      titleColor = '#d88204';
    }

    // Notes
    const hotelNoteText = hotelNote;
    const adminNoteText = adminNote;
    const customerNoteText = customerNote;

    // Fetch and resolve company details (prefer DB values when available)
    const companyDetails = await getCompanyDetails({ includeSignedUrls: true, forEmail: false, oldData: reservation?.companyDetails });

    return {
      // Company info
      // Use signed S3 URL so image is fetched from S3 in emails
      companyLogo: companyDetails?.companyLogoUrl || '',
      companyLogoUrl: companyDetails?.companyLogoUrl || '',
      companyName: companyDetails?.companyName,
      companyAddress: companyDetails?.address,
      companyEmail: companyDetails?.emails?.join(', '),
      companyPhone: companyDetails?.phones?.map(phone => phone.phone).join(', '),
      gstin: hotel?.state?.gstDetails?.[0]?.gstNumber || 'N/A',
      stateCode: hotel?.state?.code,

      // Reservation info
      bookingId,
      pnr,
      sourceId,
      checkInDate,
      checkOutDate,
      bookingDate,
      modifiedDate,
      totalNight,
      totalRooms,
      totalAdults,
      totalChildren,
      bookingType,
      reservationStatus,
      reservationTitle,
      titleColor,

      // Hotel info
      hotelName,
      hotelCity,
      hotelState,
      hotelPhone,
      hotelEmails,

      // Customer info
      customerName,
      customerEmails,
      customerPhone,

      // Financial info
      totalAmount: totalAmount.toLocaleString(),
      advanceAmount: advanceAmount.toLocaleString(),
      balanceAmount: balanceAmount.toLocaleString(),
      netAmount: netAmount.toFixed(2),
      commission: commission.toFixed(2),
      grandTotal: grandTotal.toLocaleString(),

      // Hotel-specific financial calculations
      netAmountForHotel: netAmountForHotel.toFixed(2),
      gstAmountForHotel: gstAmountForHotel.toFixed(2),
      nettPayableToHotel: nettPayableToHotel.toFixed(2),
      hotelNeedsToCollect: totalAmount.toFixed(2),
      differenceAmount: commission.toFixed(2),
      advanceCollected: advanceAmount.toFixed(2),
      balanceToBePaidByHotel: paidBalance.toFixed(2),
      wchBalance: wchBalance.toFixed(2),

      // Calculated values for hotel template
      roomCharges: netAmountForHotel.toFixed(2),
      gstAmount: gstAmountForHotel.toFixed(2),
      balanceToBePaid: paidBalance.toFixed(2),

      // Room details
      roomDetailsHTML,

      // Notes
      hotelNote: hotelNoteText,
      adminNote: adminNoteText,
      customerNote: customerNoteText,

      // OTA Commission
      otaCommission: parseFloat(otaCommission || 0).toFixed(2),

      // Created by info
      createdBy: createdBy,

      // Hotel GST info
      hotelGstNumber,
      hotelGstHolderName,
      hotelGstAddress,
      bankName: hotel?.financialInformation?.bankName || 'N/A',
      beneficiaryName: hotel?.financialInformation?.beneficiaryName || 'N/A',
      accountName: hotel?.financialInformation?.beneficiaryName || 'N/A', // Same as beneficiaryName
      accountNumber: hotel?.financialInformation?.accountNumber || 'N/A',
      ifscCode: hotel?.financialInformation?.ifscCode || 'N/A',
    };
  }
}

module.exports = TemplateHelper; 