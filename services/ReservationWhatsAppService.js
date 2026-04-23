/**
 * Reservation WhatsApp Service
 * Handles sending WhatsApp messages for reservation notifications
 */

const WhatsAppService = require('./whatsapp/WhatsAppService');
const config = require('../config/whatsapp');
const { getCompanyDetails } = require('../utils/common');
const TemplateHelper = require('../utils/templateHelper');
const { getGoogleMapsLink } = require('../utils/templateHelper');
const { getResturantDetails } = require('../helper/resturant');

class ReservationWhatsAppService {
  /**
   * Build reservation data for WhatsApp template
   * @param {Object} reservation - Reservation data with relations
   * @returns {Promise<Object>} Formatted data for template
   */
  static async buildReservationData(reservation) {
    try {
      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};

      // Prefer live relations, fallback to snapshot when missing
      const hotel = snapshot?.hotels || reservationData?.hotels || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      const bookingDetails = reservationData?.bookingDetails || [];

      // Get room types (comma-separated if multiple)
      const roomTypes = bookingDetails
        ?.map((detail) => {
          const room = detail?.rooms || snapshot?.bookingDetails?.find((b) => b.id === detail.id)?.rooms;
          return room?.roomName || 'N/A';
        })
        .filter((name) => name !== 'N/A')
        .join(', ') || 'N/A';

      const ratePlans = bookingDetails
        ?.map((detail) => {
          const ratePlan = detail?.ratePlans || snapshot?.bookingDetails?.find((b) => b.id === detail.id)?.ratePlans;
          return ratePlan?.name || 'N/A';
        })
        .filter((name) => name !== 'N/A')
        .join(', ') || 'N/A';

      // Calculate amounts
      const bookingAmount = Number(reservationData?.saleAmt || 0); // includes GST
      const netAmount = Number(reservationData?.netAmt || 0);

      const totalPayableAmount = Number(reservationData?.totalPayableAmount || 0);
      const advanceAmount = Number(reservationData?.advance || 0);
      const payableAmountPending = Number(totalPayableAmount - advanceAmount);
      const payableAmountPayAtHotel = Number(netAmount - advanceAmount || 0);

      const checkInDate = reservationData?.checkingDate;
      const checkOutDate = reservationData?.checkoutDate;

      // Get restaurant/hotel details for check-in/out times
      const resturantDetails = await getResturantDetails(snapshot);
      const checkInTimeRaw = resturantDetails?.checkInCheckOutDetails?.checkInTime || '';
      const checkOutTimeRaw = resturantDetails?.checkInCheckOutDetails?.checkOutTime || '';
      const checkinTime = checkInTimeRaw ? TemplateHelper.formatTimeToAMPM(checkInTimeRaw) : '';
      const checkoutTime = checkOutTimeRaw ? TemplateHelper.formatTimeToAMPM(checkOutTimeRaw) : '';

      // Get company details for footer - need includeSignedUrls: true to get base64 logo
      const companyDetails = await getCompanyDetails({ includeSignedUrls: true, forEmail: true });
      
      // Format company contact info
      // Handle phones as array of strings or array of objects with phone property
      let companyPhone = '+91 9954363505 / 9999880803 / 7399888844'; // Default
      if (companyDetails?.phones) {
        if (Array.isArray(companyDetails.phones)) {
          const phoneValues = companyDetails.phones.map(phone => {
            return typeof phone === 'string' ? phone : phone?.phone || phone;
          }).filter(Boolean);
          if (phoneValues.length > 0) {
            companyPhone = phoneValues.join(' / ');
          }
        }
      }
      
      const companyEmail = companyDetails?.emails?.join(', ') || 'info@wchotels.com, reservations@wchotels.com';
      const companyName = companyDetails?.companyName || 'World Choice Hotels Pvt. Ltd.';
      const companyAddress = companyDetails?.address || 'Qutub Vihar, Phase 1, Sector 19 Dwarka, New Delhi – 110071';
      
      // Get company logo as base64 data URI for PDF embedding
      let companyLogoBase64 = '';
      if (companyDetails?.companyLogoUrl) {
        // companyLogoUrl should already be base64 when forEmail: true
        companyLogoBase64 = companyDetails.companyLogoUrl;
      }

      const googleMapsLink = getGoogleMapsLink(hotel) || '#';

      return {
        // Hotel info
        hotelName: hotel?.name || 'N/A',
        city: hotel?.city?.name || 'N/A',
        state: hotel?.state?.name || 'N/A',
        googleMapsLink,
        
        // Guest info
        guestName: customer?.name || 'N/A',
        
        // Booking info
        bookingId: reservationData?.bookingId || 'N/A',
        checkinDate: TemplateHelper.formatDate(checkInDate), // Formatted for template
        checkoutDate: TemplateHelper.formatDate(checkOutDate), // Formatted for template
        checkinTime, // Formatted check-in time (AM/PM format)
        checkoutTime, // Formatted check-out time (AM/PM format)
        roomType: roomTypes,
        numberOfRooms: reservationData?.totalRooms || 1,
        numberOfNights: reservationData?.totalNight || 0,
        totalAdults: reservationData?.totalAdults || 0,
        totalChildren: reservationData?.totalChildren || 0,
        ratePlans: ratePlans,
        // Amounts
        bookingAmount: bookingAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        totalPayableAmount: totalPayableAmount.toFixed(2),
        advanceAmount: advanceAmount.toFixed(2),
        payableAmountPending: payableAmountPending.toFixed(2),
        payableAmountPayAtHotel: payableAmountPayAtHotel.toFixed(2),
        
        // Company info
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        companyLogo: companyLogoBase64 // Base64 data URI for PDF
      };
    } catch (error) {
      console.error('Error building reservation data for WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Get hotel WhatsApp number(s)
   * @param {Object} hotel - Hotel object
   * @returns {Array<string>} Array of WhatsApp numbers
   */
  static getHotelWhatsAppNumbers(hotel) {
    const numbers = [];

    // Check mobile field (JSON array)
    if (hotel?.mobile) {
      const mobileArray = Array.isArray(hotel.mobile) ? hotel.mobile : [hotel.mobile];
      mobileArray.forEach((mobile) => {
        if (mobile && mobile.trim() && mobile.trim() !== 'N/A') {
          // const formattedMobile = mobile.startsWith('+') ? mobile : mobile.startsWith('91') ? `+${mobile}` : `+91${mobile}`;
          if (!numbers.includes(mobile)) {
            numbers.push(mobile);
          }
        }
      });
    }

    return numbers;
  }

  /**
   * Get guest WhatsApp number(s)
   * @param {Object} customer - Customer object from reservation
   * @returns {Array<string>}
   */
  static getGuestWhatsAppNumbers(customer) {
    const numbers = [];
    const add = (nums) => {
      for (const num of nums) {
        const raw = String(num).trim();
        if (!raw) return;
        // const formatted = raw.startsWith('+') ? raw : raw.startsWith('91') ? `+${raw}` : `+91${raw}`;
        if (!numbers.includes(raw)) numbers.push(raw);
      }
    };
    add(customer?.mobile || []);
    return numbers;
  }

  /**
   * Send new booking WhatsApp notification to hotel as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @param {string} options.baseUrl - Server base URL (optional)
   * @returns {Promise<Object>} Result object
   */
  static async sendNewBookingNotification(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      // Get hotel from reservation
      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const hotel = snapshot?.hotels || reservationData?.hotels || {};

      if (!hotel || (!hotel.mobile)) {
        console.log('Hotel WhatsApp number not found');
        return { success: false, message: 'Hotel WhatsApp number not found' };
      }

      // Get hotel WhatsApp numbers
      const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);

      if (whatsappNumbers.length === 0) {
        console.log('No valid WhatsApp numbers found for hotel');
        return { success: false, message: 'No valid WhatsApp numbers found for hotel' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.totalPayableAmount,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of whatsappNumbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'newBooking',
            templateData,
            'new-booking', // fileName - will be auto-generated
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      return {
        success: successCount > 0,
        totalRecipients: whatsappNumbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending new booking WhatsApp notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send modified reservation WhatsApp notification to hotel
   * @param {Object} reservation - Complete reservation data with relations
   * @returns {Promise<Object>} Result object
   */
  /**
   * Send modified reservation WhatsApp notification to hotel as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendModifiedReservationNotification(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      // Get hotel from reservation
      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const hotel = snapshot?.hotels || reservationData?.hotels || {};

      if (!hotel || (!hotel.mobile)) {
        console.log('Hotel WhatsApp number not found');
        return { success: false, message: 'Hotel WhatsApp number not found' };
      }

      // Get hotel WhatsApp numbers
      const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);

      if (whatsappNumbers.length === 0) {
        console.log('No valid WhatsApp numbers found for hotel');
        return { success: false, message: 'No valid WhatsApp numbers found for hotel' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.totalPayableAmount,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of whatsappNumbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'modifiedReservation',
            templateData,
            'modified-booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: whatsappNumbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending modified reservation WhatsApp notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send cancelled reservation WhatsApp notification to hotel
   * @param {Object} reservation - Complete reservation data with relations
   * @returns {Promise<Object>} Result object
   */
  /**
   * Send cancelled reservation WhatsApp notification to hotel as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendCancelledReservationNotification(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      // Get hotel from reservation
      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const hotel = snapshot?.hotels || reservationData?.hotels || {};

      if (!hotel || (!hotel.mobile)) {
        console.log('Hotel WhatsApp number not found');
        return { success: false, message: 'Hotel WhatsApp number not found' };
      }

      // Get hotel WhatsApp numbers
      const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);

      if (whatsappNumbers.length === 0) {
        console.log('No valid WhatsApp numbers found for hotel');
        return { success: false, message: 'No valid WhatsApp numbers found for hotel' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.totalPayableAmount,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of whatsappNumbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'cancelledReservation',
            templateData,
            'cancelled-booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: whatsappNumbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending cancelled reservation WhatsApp notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send booking confirmation to guest via WhatsApp as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendBookingConfirmationToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;
      
      // Format and build check-in/out time info HTML
      templateData.checkinTimeInfo = templateData?.checkinTime ? `<li>Check-in time: ${templateData.checkinTime}</li>` : '';
      templateData.checkoutTimeInfo = templateData?.checkoutTime ? `<li>Check-out time: ${templateData.checkoutTime}</li>` : '';

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.netAmount,
          templateData?.googleMapsLink,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };
      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'bookingConfirmationGuest',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending booking confirmation to guest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send modified reservation message to guest via WhatsApp as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendModifiedReservationToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;
      
      // Format and build check-in/out time info HTML
      templateData.checkinTimeInfo = templateData?.checkinTime ? `<li>Check-in time: ${templateData.checkinTime}</li>` : '';
      templateData.checkoutTimeInfo = templateData?.checkoutTime ? `<li>Check-out time: ${templateData.checkoutTime}</li>` : '';

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.netAmount,
          templateData?.googleMapsLink,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'modifiedReservationGuest',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending modified reservation to guest:', error);
      return { success: false, error: error.message };
    }
  }


  /**
   * Send cancellation message to guest via WhatsApp
   * @param {Object} reservation - Complete reservation data with relations
   */
  /**
   * Send cancelled reservation message to guest via WhatsApp as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendCancelledReservationToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.netAmount,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'cancelledReservationGuest',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending cancelled reservation to guest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send direct payment (pay-at-hotel) new booking message to hotel
   */
  /**
   * Send direct payment new booking WhatsApp notification to hotel as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendDirectPaymentNewBookingToHotel(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      
      // Require direct payment
      const paymentName = (snapshot?.paymentTypes || reservationData?.paymentTypes || {}).name;
      if (String(paymentName).toLowerCase() !== 'direct payment') {
        return { success: false, message: 'Payment type is not Direct Payment' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const hotel = snapshot?.hotels || reservationData?.hotels || {};

      if (!hotel || (!hotel.mobile)) {
        console.log('Hotel WhatsApp number not found');
        return { success: false, message: 'Hotel WhatsApp number not found' };
      }

      // Get hotel WhatsApp numbers
      const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);

      if (whatsappNumbers.length === 0) {
        console.log('No valid WhatsApp numbers found for hotel');
        return { success: false, message: 'No valid WhatsApp numbers found for hotel' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.advanceAmount,
          templateData?.payableAmountPayAtHotel,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of whatsappNumbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'directPaymentHotel',
            templateData,
            'new-booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: whatsappNumbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending direct payment WhatsApp to hotel:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send direct payment modified reservation WhatsApp to hotel
   */
  /**
   * Send direct payment modified reservation WhatsApp notification to hotel as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendDirectPaymentModifiedToHotel(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const hotel = snapshot?.hotels || reservationData?.hotels || {};

      if (!hotel || (!hotel.mobile)) {
        console.log('Hotel WhatsApp number not found');
        return { success: false, message: 'Hotel WhatsApp number not found' };
      }

      // Get hotel WhatsApp numbers
      const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);

      if (whatsappNumbers.length === 0) {
        console.log('No valid WhatsApp numbers found for hotel');
        return { success: false, message: 'No valid WhatsApp numbers found for hotel' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.advanceAmount,
          templateData?.payableAmountPayAtHotel,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of whatsappNumbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'directPaymentHotelModified',
            templateData,
            'modified-booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: whatsappNumbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending direct payment modified WhatsApp to hotel:', error);
      return { success: false, error: error.message };
    }
  }


  /**
   * Send direct payment cancellation WhatsApp to hotel
   */
  /**
   * Send direct payment cancelled reservation WhatsApp notification to hotel as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendDirectPaymentCancelledToHotel(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      
      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const hotel = snapshot?.hotels || reservationData?.hotels || {};

      if (!hotel || (!hotel.mobile)) {
        console.log('Hotel WhatsApp number not found');
        return { success: false, message: 'Hotel WhatsApp number not found' };
      }

      // Get hotel WhatsApp numbers
      const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);

      if (whatsappNumbers.length === 0) {
        console.log('No valid WhatsApp numbers found for hotel');
        return { success: false, message: 'No valid WhatsApp numbers found for hotel' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];

      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.advanceAmount,
          templateData?.payableAmountPayAtHotel,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of whatsappNumbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'directPaymentHotelCancelled',
            templateData,
            'cancelled-booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: whatsappNumbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending direct payment cancelled WhatsApp to hotel:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send direct payment created reservation WhatsApp to guest as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendDirectPaymentCreatedToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      
      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);
      const customer = snapshot?.customers || reservationData?.customers || {};

      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;
      
      // Format and build check-in/out time info HTML
      templateData.checkinTimeInfo = templateData?.checkinTime ? `<li>Check-in time: ${templateData.checkinTime}</li>` : '';
      templateData.checkoutTimeInfo = templateData?.checkoutTime ? `<li>Check-out time: ${templateData.checkoutTime}</li>` : '';

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.googleMapsLink,
          templateData?.advanceAmount,
          templateData?.payableAmountPayAtHotel,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'directPaymentGuestCreated',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending direct payment created WhatsApp to guest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send direct payment modified reservation WhatsApp to guest
   */
  /**
   * Send direct payment modified reservation WhatsApp to guest as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendDirectPaymentModifiedToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      
      const paymentName = (snapshot?.paymentTypes || reservationData?.paymentTypes || {}).name;
      if (String(paymentName).toLowerCase() !== 'direct payment') {
        return { success: false, message: 'Payment type is not Direct Payment' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const customer = snapshot?.customers || reservationData?.customers || {};
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;
      
      // Format and build check-in/out time info HTML
      templateData.checkinTimeInfo = templateData?.checkinTime ? `<li>Check-in time: ${templateData.checkinTime}</li>` : '';
      templateData.checkoutTimeInfo = templateData?.checkoutTime ? `<li>Check-out time: ${templateData.checkoutTime}</li>` : '';

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.googleMapsLink,
          templateData?.advanceAmount,
          templateData?.payableAmountPayAtHotel,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'directPaymentGuestModified',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending direct payment modified WhatsApp to guest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send direct payment cancelled reservation WhatsApp to guest
   */
  /**
   * Send direct payment cancelled reservation WhatsApp to guest as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendDirectPaymentCancelledToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);
      const customer = snapshot?.customers || reservationData?.customers || {};
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.advanceAmount,
          templateData?.payableAmountPayAtHotel,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'directPaymentGuestCancelled',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending direct payment cancelled WhatsApp to guest:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send check-in reminder to guest via WhatsApp (for upcoming stays)
   * @param {Object} reservation - Complete reservation data with relations
   */
  /**
   * Send check-in reminder to guest via WhatsApp as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendCheckinReminderToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;
      
      // Format and build check-in time info HTML
      templateData.checkinTimeInfo = templateData?.checkinTime ? `<li>Check-in time: ${templateData.checkinTime}</li>` : '';

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.googleMapsLink,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'checkinReminderGuest',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending check-in reminder to guest:', error);
      return { success: false, error: error.message };
    }
  }

    /**
   * Send check-out reminder to guest via WhatsApp as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendCheckoutReminderToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      
      // Build hotel location HTML
      templateData.hotelLocation = templateData?.googleMapsLink ? `<a href="${templateData.googleMapsLink}" target="_blank">View on Google Maps</a>` : `${templateData.hotelName}, ${templateData.city}, ${templateData.state}`;
      
      // Format and build check-out time info HTML
      templateData.checkoutTimeInfo = templateData?.checkoutTime ? `<li>Standard check-out time: ${templateData.checkoutTime}</li>` : '';

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      
      const pdfOptions = {
        ...options,
        templateParams: [
          `${templateData?.hotelName}, ${templateData?.city}, ${templateData?.state}`,
          templateData?.guestName,
          templateData?.bookingId,
          templateData?.checkinDate,
          templateData?.checkoutDate,
          `${templateData?.roomType}, ${templateData?.ratePlans}`,
          templateData?.totalAdults,
          templateData?.totalChildren,
          templateData?.numberOfRooms,
          templateData?.numberOfNights,
          templateData?.companyPhone,
          templateData?.companyEmail
        ]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'checkoutReminderGuest',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending check-out reminder to guest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send check-in day reminder to guest via WhatsApp (for check-in day)
   * @param {Object} reservation - Complete reservation data with relations
   */
  static async sendCheckinDayReminderToGuest(reservation) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const hotel = snapshot?.hotels || reservationData?.hotels || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      const resturantDetails = await getResturantDetails(snapshot);

      const roomTypes = (reservationData?.bookingDetails || [])
        .map((bd) => (bd?.rooms || snapshot?.bookingDetails?.find(b => b.id === bd.id)?.rooms)?.roomName)
        .filter(Boolean)
        .join(', ') || 'N/A';

      // Get payment type name
      const paymentType = snapshot?.paymentTypes || reservationData?.paymentTypes || {};
      const reservationType = paymentType?.name || 'N/A';

      // Calculate balance amount
      const sale = Number(reservationData?.saleAmt || 0);
      const advance = Number(reservationData?.advance || 0);
      const balance = Number(reservationData?.balance ?? (sale - advance));
      const balanceAmount = balance > 0 ? balance.toFixed(2) : '0.00';

      // Get hotel phone numbers
      let hotelPhoneNumbers = 'N/A';
      if (hotel?.phone) {
        hotelPhoneNumbers = Array.isArray(hotel.phone) ? hotel.phone.join(', ') : hotel.phone;
      } else if (hotel?.mobile) {
        const mobileArray = Array.isArray(hotel.mobile) ? hotel.mobile : [hotel.mobile];
        hotelPhoneNumbers = mobileArray.filter(m => m && m !== 'N/A').join(', ') || 'N/A';
      }

      const vars = {
        guestName: customer?.name || 'Guest',
        hotelName: hotel?.name || 'Hotel',
        city: hotel?.city?.name || '',
        state: hotel?.state?.name || '',
        bookingId: reservationData?.bookingId || reservationData?.id,
        checkInDate: reservationData?.checkingDate,
        checkOutDate: reservationData?.checkoutDate,
        roomType: roomTypes,
        numberOfRooms: reservationData?.totalRooms || 1,
        numberOfNights: reservationData?.totalNight || 0,
        totalAdults: reservationData?.totalAdults || 0,
        totalChildren: reservationData?.totalChildren || 0,
        reservationType,
        balanceAmount,
        hotelPhoneNumbers,
        googleMapsLink: getGoogleMapsLink(hotel),
        checkInTime: resturantDetails?.checkInCheckOutDetails?.checkInTime
      };

      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      const whatsappService = new WhatsAppService();
      const results = [];
      for (const number of numbers) {
        try {
          const result = await whatsappService.sendTemplateMessage(number, 'checkinDayReminderGuest', vars);
          results.push({ number, ...result });
        } catch (err) {
          results.push({ number, success: false, error: err.message });
        }
      }
      const successCount = results.filter(r => r.success).length;
      return { success: successCount > 0, totalRecipients: numbers.length, successCount, results };
    } catch (error) {
      console.error('Error sending check-in day reminder to guest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send thank-you stay message to guest after checkout
   * @param {Object} reservation
   */
  /**
   * Send thank-you stay message to guest via WhatsApp as PDF
   * @param {Object} reservation - Complete reservation data with relations
   * @param {Object} options - Options object for PDF generation
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  static async sendThankYouStayToGuest(reservation, options = {}) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      // Build reservation data for template
      const templateData = await this.buildReservationData(reservation);

      const reservationData = reservation?.toJSON ? reservation.toJSON() : reservation;
      const snapshot = reservationData?.oldData || {};
      const hotel = snapshot?.hotels || reservationData?.hotels || {};
      const customer = snapshot?.customers || reservationData?.customers || {};
      
      // Build Google Review Link HTML
      const googleReviewLink = hotel?.googleReviewLink || 
        `https://www.google.com/search?q=${encodeURIComponent((hotel?.name || '') + ' ' + (hotel?.city?.name || ''))}`;
      templateData.googleReviewLink = `<a href="${googleReviewLink}" class="feedback-link" target="_blank">Submit Your Review</a>`;

      // Resolve guest numbers
      const numbers = this.getGuestWhatsAppNumbers(customer);
      if (numbers.length === 0) {
        return { success: false, message: 'Guest WhatsApp number not found' };
      }

      // Send PDF via WhatsApp to each number
      const whatsappService = new WhatsAppService();
      const results = [];
      const pdfOptions = {
        ...options,
        templateParams: [templateData?.guestName, templateData?.hotelName]
      };

      for (const number of numbers) {
        try {
          // Generate and send PDF via WhatsApp
          const result = await whatsappService.generateAndSendPDF(
            number,
            'thankYouStayGuest',
            templateData,
            'booking', // fileName prefix
            pdfOptions
          );

          results.push({
            number,
            ...result
          });
        } catch (error) {
          console.error(`Error sending WhatsApp PDF to ${number}:`, error);
          results.push({
            number,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalRecipients: numbers.length,
        successCount,
        results
      };
    } catch (error) {
      console.error('Error sending thank-you stay to guest:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReservationWhatsAppService;

