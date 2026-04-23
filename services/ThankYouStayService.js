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
const ReservationWhatsAppService = require('./ReservationWhatsAppService');

class ThankYouStayService {
  /**
   * Get start and end of day for checkout date
   * @param {Date} date - Date object
   * @returns {Object} Start and end of day
   */
  static startAndEndOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
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
   * Fetch guests who checked out on the target date
   * @param {Date} targetDate - Target checkout date
   * @returns {Promise<Object>} Checkout data
   */
  static async fetchCheckoutGuests(targetDate = new Date()) {
    const { start, end } = this.startAndEndOfDay(targetDate);

    const checkouts = await Reservation.findAll({
      where: {
        checkoutDate: { [Op.between]: [start, end] },
        status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
      },
      include: [
        { model: BookingDetail, as: 'bookingDetails', include: [
          { model: Room, as: 'rooms' },
          { model: RatePlan, as: 'ratePlans' },
        ] },
        { model: Hotel, as: 'hotels', include: [{ model: City, as: 'city' }, { model: State, as: 'state' }] },
        { model: Customer, as: 'customers' },
        { model: PaymentType, as: 'paymentTypes' },
      ],
      order: [['id', 'ASC']],
    });

    return { checkouts, start, end };
  }

  /**
   * Build HTML content for thank you email
   * @param {Object} reservation - Reservation data
   * @returns {Promise<string>} HTML content
   */
  static async buildThankYouHTML(reservation) {
    const hotel = reservation.hotels;
    const customer = reservation.customers;
    const bookingDetails = reservation.bookingDetails || [];

    // Get room types and meal plans
    const roomTypes = bookingDetails.map(bd => bd.rooms?.roomName).filter(Boolean).join(', ') || 'N/A';
    const mealPlans = bookingDetails.map(bd => bd.ratePlans?.name).filter(Boolean).join(', ') || 'N/A';
    const nightsStayed = reservation.totalNight;

    // Prepare template data
    const templateData = {
      'Guest Name': customer?.name || 'Valued Guest',
      'Hotel Name': hotel?.name || 'Our Hotel',
      'City': hotel?.city?.name || '',
      'State': hotel?.state?.name || '',
      'Check In Date': this.formatShort(reservation.checkingDate),
      'Check Out Date': this.formatShort(reservation.checkoutDate),
      'Reservation No': reservation.bookingId || reservation.id,
      'Reference No': reservation.pnr || reservation.bookingId || '',
      'Adults': reservation.totalAdults || 0,
      'Children': reservation.totalChildren || 0,
      'Room Type': roomTypes,
      'Meal Plan': mealPlans,
      'Nights': nightsStayed,
      'Hotel Address': hotel?.address || '',
      'Hotel Phone': hotel?.phone || '',
      'Google Review Link': hotel?.googleReviewLink || 'https://www.google.com/search?q=' + encodeURIComponent(hotel?.name + ' ' + hotel?.city?.name),
      'Google Maps Link': TemplateHelper.getGoogleMapsLink(hotel),
    };

    return TemplateHelper.loadAndProcessTemplate('thank-you-stay', templateData);
  }

  /**
   * Send thank you email to a single guest
   * @param {Object} reservation - Reservation data
   * @returns {Promise<Object>} Result object
   */
  static async sendThankYouEmail(reservation) {
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
      const html = await this.buildThankYouHTML(reservation);
      
      // Prepare subject
      const hotelName = reservation.hotels?.name || '';
      const city = reservation.hotels?.city?.name || '';
      const state = reservation.hotels?.state?.name || '';
      const date = this.formatShort(new Date());
      const subject = `Thank You for Staying with Us - ${hotelName}, ${city}, ${state} - WorldCRS.com - World Choice Hotels - ${date}`;

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
        customerName: reservation.customers.name
      };

    } catch (error) {
      console.error('Error sending thank you email:', error);
      return {
        success: false,
        error: error.message,
        reservationId: reservation.id
      };
    }
  }

  /**
   * Send thank you emails for guests who checked out on the target date
   * @param {Date} targetDate - Target checkout date
   * @returns {Promise<Object>} Summary of results
   */
  static async sendForDate(targetDate = new Date()) {
    try {
      const { checkouts } = await this.fetchCheckoutGuests(targetDate);
      
      const results = {
        total: checkouts.length,
        sent: 0,
        failed: 0,
        errors: [],
        whatsapp: { sent: 0, failed: 0 }
      };

      // Send emails to each guest
      for (const reservation of checkouts) {
        const result = await this.sendThankYouEmail(reservation);
        
        if (result.success) {
          results.sent++;
          console.log(`Thank you email sent to: ${result.customerName} (${result.customerEmail})`);
        } else {
          results.failed++;
          results.errors.push({
            reservationId: result.reservationId,
            error: result.error
          });
          console.error(`Failed to send thank you email for reservation ${result.reservationId}: ${result.error}`);
        }
      }

      console.log(`Thank you emails summary: ${results.sent} sent, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('Error in sendForDate:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp thank-you messages to guests checked out on target date
   */
  static async sendWhatsAppForDate(targetDate = new Date()) {
    const { checkouts } = await this.fetchCheckoutGuests(targetDate);
    const results = { total: checkouts.length, sent: 0, failed: 0, errors: [] };
    for (const reservation of checkouts) {
      try {
        const wa = await ReservationWhatsAppService.sendThankYouStayToGuest(reservation);
        if (wa.success) results.sent += 1; else results.failed += 1;
      } catch (e) {
        results.failed += 1;
        results.errors.push({ reservationId: reservation.id, error: e.message });
      }
    }
    return results;
  }
}

module.exports = ThankYouStayService;
