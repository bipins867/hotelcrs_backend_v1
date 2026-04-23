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

class UpcomingStayService {
  static startAndEndOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  static async fetchTomorrowCheckins(targetDate = new Date()) {
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start, end } = this.startAndEndOfDay(tomorrow);

    const checkins = await Reservation.findAll({
      where: {
        checkingDate: { [Op.between]: [start, end] },
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

    return { checkins, start, end };
  }

  static async buildUpcomingHTML(reservation) {
    const hotel = reservation.hotels;
    const customer = reservation.customers;
    const bookingDetails = reservation.bookingDetails || [];

    const roomTypes = bookingDetails.map(bd => bd.rooms?.roomName).filter(Boolean).join(', ') || 'N/A';
    const mealPlans = bookingDetails.map(bd => bd.ratePlans?.name).filter(Boolean).join(', ') || 'N/A';
    const nights = reservation.totalNight;

    const templateData = {
      'Guest Name': customer?.name || 'Valued Guest',
      'Hotel Name': hotel?.name || 'Our Hotel',
      'City': hotel?.city?.name || '',
      'State': hotel?.state?.name || '',
      'Check In Date': this.formatShort(reservation.checkingDate),
      'Check Out Date': this.formatShort(reservation.checkoutDate),
      'Reservation No': reservation.bookingId || reservation.id,
      'Adults': reservation.totalAdults || 0,
      'Children': reservation.totalChildren || 0,
      'Room Type': roomTypes,
      'Meal Plan': mealPlans,
      'Nights': nights,
      'Hotel Address': hotel?.address || '',
      'Hotel Phone': hotel?.phone || '',
      'Hotel Email': Array.isArray(hotel?.email) ? hotel.email.join(', ') : (hotel?.email || ''),
      'Google Maps Link': TemplateHelper.getGoogleMapsLink(hotel),
      'Email Generation Date': TemplateHelper.formatDate(new Date(), 'DDMMYYYY'),
    };

    return TemplateHelper.loadAndProcessTemplate('your-upcoming-stay', templateData);
  }

  static async sendUpcomingEmail(reservation) {
    try {
      if (!reservation.customers?.email) {
        return { success: false, error: 'Customer email not found', reservationId: reservation.id };
      }

      const html = await this.buildUpcomingHTML(reservation);

      const hotelName = reservation.hotels?.name || '';
      const city = reservation.hotels?.city?.name || '';
      const date = this.formatShort(new Date());
      const subject = `Your Upcoming Stay at ${hotelName}, ${city} – Booking ID ${reservation.bookingId || reservation.id} - WorldCRS.com - World Choice Hotels - ${date}`;

      await EmailService.sendEmail({
        to: reservation.customers.email,
        subject,
        html
      });

      return { success: true, reservationId: reservation.id, customerEmail: reservation.customers.email, customerName: reservation.customers.name };
    } catch (error) {
      console.error('Error sending upcoming stay email:', error);
      return { success: false, error: error.message, reservationId: reservation.id };
    }
  }

  static async sendForDate(targetDate = new Date()) {
    const { checkins } = await this.fetchTomorrowCheckins(targetDate);

    // Skip sending if there are no upcoming check-ins
    if (!checkins || checkins.length === 0) {
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const results = { total: checkins.length, sent: 0, failed: 0, errors: [], whatsapp: { sent: 0, failed: 0 } };

    for (const reservation of checkins) {
      const result = await this.sendUpcomingEmail(reservation);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ reservationId: result.reservationId, error: result.error });
      }

      // Fire-and-forget WhatsApp reminder to guest
      try {
        const wa = await ReservationWhatsAppService.sendCheckinReminderToGuest(reservation);
        if (wa.success) results.whatsapp.sent += 1; else results.whatsapp.failed += 1;
      } catch (waErr) {
        results.whatsapp.failed += 1;
        results.errors.push({ reservationId: reservation.id, error: `whatsapp: ${waErr.message}` });
      }
    }

    return results;
  }
}

module.exports = UpcomingStayService;


