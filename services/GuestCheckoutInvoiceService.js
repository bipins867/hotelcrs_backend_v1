'use strict';

const { Op } = require('sequelize');
const {
  Reservation,
  BookingDetail,
  Hotel,
  Customer,
  City,
  State,
  Country,
  Room,
  RatePlan,
} = require('../db/models');
const TemplateHelper = require('../utils/templateHelper');
const EmailService = require('./EmailService');
const ReservationInvoiceService = require('./ReservationInvoiceService');
const PDFHelper = require('../utils/pdfHelper');
const { getCompanyDetails } = require('../utils/common');
const { bindReservationData } = require('../helper/reservation');

class GuestCheckoutInvoiceService {
  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  static formatDDMMYYYY(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${month}${year}`;
  }

  /**
   * Fetch reservations that checked out on the target date
   */
  static async fetchTodayCheckOuts(targetDate = new Date()) {
    const dateString = targetDate.toISOString().split('T')[0];

    const checkOuts = await Reservation.findAll({
      where: {
        checkoutDate: dateString,
        status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
      },
      include: [
        { 
          model: BookingDetail, 
          as: 'bookingDetails',
          include: [
            { model: Room, as: 'rooms' },
            { model: RatePlan, as: 'ratePlans' },
          ],
        },
        { 
          model: Hotel, 
          as: 'hotels',
          include: [
            { model: City, as: 'city' }, 
            { model: State, as: 'state' },
            { model: Country, as: 'country' },
          ],
        },
        { model: Customer, as: 'customers' },
      ],
      order: [['id', 'ASC']],
    });

    return { checkOuts };
  }

  /**
   * Generate GST invoice PDF for a reservation
   */
  static async generateInvoicePDF(reservation, companyDetails) {
    try {
      // Bind reservation data using oldData
      const boundReservation = await bindReservationData(reservation);
      
      // Prepare reservation data with company details (use companyDetails from oldData if available, otherwise use provided)
      const reservationData = {
        ...boundReservation,
        companyDetails: boundReservation.companyDetails || companyDetails
      };

      // Build HTML for tax invoice
      const { html } = await ReservationInvoiceService.buildHTML(reservationData);

      // Generate PDF filename: GST Invoice - Booking-{Guest_Name}-{CheckOut_Date}.pdf
      const guestName = (reservationData?.customers?.name || 'Guest').replace(/[^a-zA-Z0-9]/g, '');
      const checkoutDate = this.formatDDMMYYYY(reservationData.checkoutDate);
      const fileName = `GST Invoice - Booking-${guestName}-${checkoutDate}.pdf`;

      // Generate PDF buffer for email attachment
      const pdfBuffer = await PDFHelper.generatePDFFromHTML(html);

      return {
        pdfBuffer,
        fileName,
      };
    } catch (error) {
      console.error(`Error generating invoice PDF for reservation ${reservation.id}:`, error);
      throw error;
    }
  }

  /**
   * Build email HTML for guest checkout invoice
   */
  static async buildGuestCheckoutInvoiceHTML(reservation, companyDetails, attachmentFileName) {
    // Bind reservation data using oldData
    const boundReservation = await bindReservationData(reservation);
    
    const hotel = boundReservation.hotels;
    const customer = boundReservation.customers;
    const bookingDetails = boundReservation.bookingDetails || [];

    // Get room types from bound reservation data
    const roomTypes = bookingDetails
      .map((bd) => bd?.rooms?.roomName)
      .filter(Boolean)
      .join(', ') || 'N/A';

    // Prepare template data using bound reservation data
    const dataForTemplate = {
      Guest_Name: customer?.name || 'Valued Guest',
      Hotel_Name: hotel?.name || '',
      City: hotel?.city?.name || '',
      State: hotel?.state?.name || '',
      Country: hotel?.country?.name || '',
      Booking_ID: boundReservation.bookingId || '',
      Checkin_Date: this.formatShort(boundReservation.checkingDate),
      CheckOut_Date: this.formatShort(boundReservation.checkoutDate),
      Room_Type: roomTypes,
      No_of_Rooms: String(boundReservation.totalRooms || 0),
      No_of_Nights: String(boundReservation.totalNight || 0),
      Adults: String(boundReservation.totalAdults || 0),
      Children: String(boundReservation.totalChildren || 0),
      Total_Amount: `₹${(parseFloat(boundReservation.saleAmt || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      Attachment_Filename: attachmentFileName || `GST Invoice - Booking-${customer?.name || 'Guest'}-${this.formatDDMMYYYY(boundReservation.checkoutDate)}.pdf`,
      Company_Name: companyDetails?.companyName || boundReservation.companyDetails?.companyName || 'World Choice Hotels Pvt. Ltd.',
      Company_Address: companyDetails?.address || boundReservation.companyDetails?.address || 'Qutub Vihar, Phase 1, Sector 19 Dwarka, New Delhi - 110071, India',
      Company_Email_1: 'reservations@wchotels.com',
      Company_Email_2: 'accounts@wchotels.com',
      Company_Phone_1: '+91 9954363505',
      Company_Phone_2: '+91 7399888844',
      Company_Phone_3: '+91 9999880803',
      Company_Phone_4: '+91 9999880833',
      Company_Website_1: 'www.wchotels.com',
      Company_Website_2: 'www.worldchoicehotels.in',
    };

    return TemplateHelper.loadAndProcessTemplate('guest-checkout-invoice', dataForTemplate);
  }

  /**
   * Send checkout invoice email to a single guest
   */
  static async sendGuestCheckoutInvoice(reservation) {
    try {
      // Bind reservation data using oldData
      const boundReservation = await bindReservationData(reservation);
      
      // Check if customer email exists
      if (!boundReservation.customers?.email) {
        return {
          success: false,
          error: 'Customer email not found',
          reservationId: reservation.id,
          bookingId: boundReservation.bookingId,
        };
      }

      // Get company details (prefer from oldData, fallback to DB)
      const companyDetails = await getCompanyDetails({ 
        includeSignedUrls: true, 
        forEmail: false,
        oldData: boundReservation.companyDetails 
      });

      // Generate invoice PDF using bound reservation
      let attachment = null;
      let attachmentFileName = null;
      try {
        const invoiceResult = await this.generateInvoicePDF(boundReservation, companyDetails);
        attachment = PDFHelper.createPDFAttachment(invoiceResult.pdfBuffer, invoiceResult.fileName);
        attachmentFileName = invoiceResult.fileName;
      } catch (invoiceError) {
        console.error(`Error generating invoice for reservation ${reservation.id}:`, invoiceError);
        // Continue without attachment if invoice generation fails
      }

      // Build email HTML using bound reservation
      const html = await this.buildGuestCheckoutInvoiceHTML(boundReservation, companyDetails, attachmentFileName);
      
      // Prepare subject using bound reservation data
      const hotelName = boundReservation.hotels?.name || '';
      const city = boundReservation.hotels?.city?.name || '';
      const state = boundReservation.hotels?.state?.name || '';
      const subject = `Thank You for Your Stay - GST Invoice - ${hotelName}, ${city}, ${state}`;

      // Prepare email recipient
      const customerEmails = Array.isArray(boundReservation.customers.email) 
        ? boundReservation.customers.email 
        : [boundReservation.customers.email];

      // Send email with attachment
      await EmailService.sendEmail({
        to: customerEmails,
        subject: subject,
        html: html,
        attachments: attachment ? [attachment] : [],
      });

      return {
        success: true,
        reservationId: reservation.id,
        bookingId: boundReservation.bookingId,
        customerEmail: customerEmails.join(', '),
        customerName: boundReservation.customers.name,
      };

    } catch (error) {
      console.error(`Error sending checkout invoice email for reservation ${reservation.id}:`, error);
      return {
        success: false,
        error: error.message,
        reservationId: reservation.id,
        bookingId: reservation.bookingId,
      };
    }
  }

  /**
   * Send checkout invoice emails to guests who checked out on the target date
   * @param {Date} targetDate - Target checkout date
   * @returns {Promise<Object>} Summary of results
   */
  static async sendForDate(targetDate = new Date()) {
    try {
      const { checkOuts } = await this.fetchTodayCheckOuts(targetDate);

      if (!checkOuts || checkOuts.length === 0) {
        return { sent: 0, failed: [], skipped: true };
      }

      const summary = { sent: 0, failed: [] };

      // Send emails to each guest
      for (const reservation of checkOuts) {
        const reservationData = await bindReservationData(reservation);
        const result = await this.sendGuestCheckoutInvoice(reservationData);
        
        if (result.success) {
          summary.sent++;
          console.log(`Guest checkout invoice email sent to: ${result.customerName} (${result.customerEmail}) for booking ${result.bookingId}`);
        } else {
          summary.failed.push({
            reservationId: result.reservationId,
            bookingId: result.bookingId,
            error: result.error,
          });
          console.error(`Failed to send guest checkout invoice email for reservation ${result.reservationId}: ${result.error}`);
        }
      }

      console.log(`Guest checkout invoice emails summary: ${summary.sent} sent, ${summary.failed.length} failed`);
      return summary;

    } catch (error) {
      console.error('Error in sendForDate:', error);
      throw error;
    }
  }
}

module.exports = GuestCheckoutInvoiceService;

