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
const ReservationWhatsAppService = require('./ReservationWhatsAppService');

class CheckInDayReminderService {
  static startAndEndOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Fetch reservations with check-in date matching the target date
   * @param {Date} targetDate - The date to query for check-ins (default: today)
   * @returns {Promise<Object>} Object with checkins array and date range
   */
  static async fetchTodayCheckins(targetDate = new Date()) {
    const { start, end } = this.startAndEndOfDay(targetDate);

    const checkins = await Reservation.findAll({
      where: {
        checkingDate: { [Op.between]: [start, end] },
        status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
      },
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
            { model: State, as: 'state' },
            { model: require('../db/models').Policy, as: 'policy' }
          ] 
        },
        { model: Customer, as: 'customers' },
        { model: PaymentType, as: 'paymentTypes' },
      ],
      order: [['id', 'ASC']],
    });

    return { checkins, start, end };
  }

  /**
   * Send check-in reminder WhatsApp messages to guests
   * @param {Date} targetDate - The date to query for check-ins (default: today)
   * @returns {Promise<Object>} Results object with counts
   */
  static async sendForDate(targetDate = new Date()) {
    const { checkins } = await this.fetchTodayCheckins(targetDate);

    // Skip sending if there are no check-ins today
    if (!checkins || checkins.length === 0) {
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const results = { total: checkins.length, sent: 0, failed: 0, errors: [] };

    for (const reservation of checkins) {
      try {
        const waResult = await ReservationWhatsAppService.sendCheckinDayReminderToGuest(reservation);
        if (waResult.success) {
          results.sent += waResult.successCount || 1;
        } else {
          results.failed++;
          results.errors.push({ 
            reservationId: reservation.id, 
            bookingId: reservation.bookingId,
            error: waResult.error || waResult.message || 'Unknown error' 
          });
        }
      } catch (waErr) {
        results.failed++;
        results.errors.push({ 
          reservationId: reservation.id, 
          bookingId: reservation.bookingId,
          error: `whatsapp: ${waErr.message}` 
        });
      }
    }

    return results;
  }
}

module.exports = CheckInDayReminderService;

