'use strict';

const { Op } = require('sequelize');
const {
  Reservation,
  BookingDetail,
  Hotel,
  Customer,
  City,
  State,
  PaymentType,
  Room,
  RatePlan,
} = require('../db/models');
const TemplateHelper = require('../utils/templateHelper');
const EmailService = require('./EmailService');
const { getCompanyDetails } = require('../utils/common');

class BookingConfirmationService {
  /**
   * Get start of day ISO string
   * @param {Date} date - Date object
   * @returns {string} ISO string
   */
  static startOfDayISO(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  /**
   * Get end of day ISO string
   * @param {Date} date - Date object
   * @returns {string} ISO string
   */
  static endOfDayISO(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  /**
   * Format date to short format
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  /**
   * Fetch reservations for booking confirmation emails
   * @param {string} type - Type of email: 'created', 'day_before', 'checkin_day'
   * @param {Date} targetDate - Target date for filtering
   * @returns {Promise<Array>} Array of reservations
   */
  static async fetchReservationsForConfirmation(type, targetDate = new Date()) {
    let whereCondition = {
      status: { [Op.notIn]: ['Cancel', 'Cancelled'] }
    };

    const start = new Date(targetDate);
    const end = new Date(targetDate);

    switch (type) {
      case 'created':
        // Send email when booking is created (today's bookings)
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        whereCondition.createdAt = { [Op.between]: [start, end] };
        break;

      case 'day_before':
        // Send email 1 day before check-in at 11 AM
        const tomorrow = new Date(targetDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);
        whereCondition.checkingDate = { [Op.between]: [tomorrow, tomorrowEnd] };
        break;

      case 'checkin_day':
        // Send email on check-in day at 9 AM
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        whereCondition.checkingDate = { [Op.between]: [start, end] };
        break;

      default:
        throw new Error('Invalid email type. Must be: created, day_before, or checkin_day');
    }

    const reservations = await Reservation.findAll({
      where: whereCondition,
      include: [
        {
          model: BookingDetail,
          as: 'bookingDetails',
          include: [
            { model: Room, as: 'rooms' },
            { model: RatePlan, as: 'ratePlans' },
          ]
        },
        {
          model: Hotel,
          as: 'hotels',
          include: [
            { model: City, as: 'city' },
            { model: State, as: 'state' }
          ]
        },
        { model: Customer, as: 'customers' },
        { model: PaymentType, as: 'paymentTypes' },
      ],
      order: [['id', 'ASC']],
    });

    return reservations;
  }

  /**
   * Build HTML content for booking confirmation email
   * @param {Object} reservation - Reservation object
   * @param {string} emailType - Type of email being sent
   * @returns {Promise<string>} HTML content
   */
  static async buildBookingConfirmationHTML(reservation, emailType) {
    const company = await getCompanyDetails({ includeSignedUrls: false });

    // Get room types and meal plans
    const roomTypes = reservation.bookingDetails?.map(bd => bd?.rooms?.roomName).filter(Boolean).join(', ') || 'N/A';
    const mealPlans = reservation.bookingDetails?.map(bd => bd?.ratePlans?.name).filter(Boolean).join(', ') || 'N/A';

    // Calculate nights
    const checkInDate = new Date(reservation.checkingDate);
    const checkOutDate = new Date(reservation.checkoutDate);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // Prepare template data
    const templateData = {
      'Guest Name': reservation.customers?.name || 'Guest',
      'Hotel Name': reservation.hotels?.name || 'Hotel',
      'City': reservation.hotels?.city?.name || '',
      'State': reservation.hotels?.state?.name || '',
      'Reservation No': reservation.bookingId || reservation.id,
      'Reference No': reservation.pnr || reservation.bookingId || '',
      'Adults': reservation.totalAdults || 0,
      'Children': reservation.totalChildren || 0,
      'Room Type': roomTypes,
      'Meal Plan': mealPlans,
      'Check In Date': this.formatShort(reservation.checkingDate),
      'Check Out Date': this.formatShort(reservation.checkoutDate),
      'Nights': nights,
      'NoOfRooms': reservation.totalRooms || 1,
      'Hotel Address': reservation.hotels?.address || 'Address not available',
      'Hotel Phone': reservation.hotels?.phone || 'Phone not available',
      'Hotel Email': reservation.hotels?.email || 'Email not available',
      'Google Maps Link': TemplateHelper.getGoogleMapsLink(reservation.hotels)
    };

    return TemplateHelper.loadAndProcessTemplate('booking-confirmation', templateData);
  }

  /**
   * Send booking confirmation email for a single reservation
   * @param {Object} reservation - Reservation object
   * @param {string} emailType - Type of email being sent
   * @returns {Promise<Object>} Result object
   */
  static async sendBookingConfirmationEmail(reservation, emailType) {
    try {
      // Check if customer email exists
      if (!reservation.customers?.email) {
        return {
          success: false,
          error: 'Customer email not found',
          reservationId: reservation.id
        };
      }

      // Build HTML content
      const html = await this.buildBookingConfirmationHTML(reservation, emailType);

      // Determine subject based on email type
      let subject;
      const hotelName = reservation.hotels?.name || '';
      const city = reservation.hotels?.city?.name || '';
      const reservationNo = reservation.bookingId || "";
      const date = this.formatShort(new Date());

      switch (emailType) {
        case 'created':
          subject = `Booking Confirmation - ${hotelName}, ${city} - Reservation No. ${reservationNo}, WorldCRS.com - World Choice Hotels - ${date}`;
          break;
        case 'day_before':
          subject = `Reminder: Your Stay Tomorrow - ${hotelName}, ${city} - Reservation No. ${reservationNo}, WorldCRS.com - World Choice Hotels - ${date}`;
          break;
        case 'checkin_day':
          subject = `Check-In Today - ${hotelName}, ${city} - Reservation No. ${reservationNo}, WorldCRS.com - World Choice Hotels - ${date}`;
          break;
        default:
          subject = `Booking Confirmation - ${hotelName}, ${city} - Reservation No. ${reservationNo}, WorldCRS.com - World Choice Hotels - ${date}`;
      }

      // Send email
      await EmailService.sendEmail({
        to: reservation.customers.email,
        subject: subject,
        html: html
      });

      return {
        success: true,
        reservationId: reservation.id,
        customerEmail: reservation.customers.email,
        emailType: emailType
      };

    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      return {
        success: false,
        error: error.message,
        reservationId: reservation.id
      };
    }
  }

  /**
   * Send booking confirmation emails for multiple reservations
   * @param {string} emailType - Type of email: 'created', 'day_before', 'checkin_day'
   * @param {Date} targetDate - Target date for filtering
   * @returns {Promise<Object>} Summary of results
   */
  static async sendBookingConfirmationEmails(emailType, targetDate = new Date()) {
    try {
      // Fetch reservations
      const reservations = await this.fetchReservationsForConfirmation(emailType, targetDate);

      const summary = {
        total: reservations.length,
        sent: 0,
        failed: 0,
        errors: []
      };

      // Process each reservation
      for (const reservation of reservations) {
        const result = await this.sendBookingConfirmationEmail(reservation, emailType);

        if (result.success) {
          summary.sent++;
        } else {
          summary.failed++;
          summary.errors.push({
            reservationId: reservation.id,
            error: result.error
          });
          console.error(`Failed to send email for reservation ${reservation.id}: ${result.error}`);
        }
      }

      return summary;

    } catch (error) {
      console.error('Error in sendBookingConfirmationEmails:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation email when booking is created
   * @param {Object} reservation - Reservation object
   * @returns {Promise<Object>} Result object
   */
  static async sendBookingCreatedEmail(reservation) {
    return this.sendBookingConfirmationEmail(reservation, 'created');
  }

  /**
   * Send reminder email 1 day before check-in
   * @param {Date} targetDate - Target date (should be the day before check-in)
   * @returns {Promise<Object>} Summary of results
   */
  static async sendDayBeforeCheckinEmails(targetDate = new Date()) {
    return this.sendBookingConfirmationEmails('day_before', targetDate);
  }

  /**
   * Send check-in day email
   * @param {Date} targetDate - Target date (should be the check-in day)
   * @returns {Promise<Object>} Summary of results
   */
  static async sendCheckinDayEmails(targetDate = new Date()) {
    return this.sendBookingConfirmationEmails('checkin_day', targetDate);
  }
}

module.exports = BookingConfirmationService;
