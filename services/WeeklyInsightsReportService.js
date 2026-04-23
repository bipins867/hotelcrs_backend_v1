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

class WeeklyInsightsReportService {
  static startAndEndOfWeek(date = new Date()) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }

  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  static async fetchWeeklyData(targetDate = new Date()) {
    const { start, end } = this.startAndEndOfWeek(targetDate);

    // Fetch reservations for the week
    const reservations = await Reservation.findAll({
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
      order: [['checkingDate', 'ASC']],
    });

    // Calculate basic insights
    const totalBookings = reservations.length;

    return {
      reservations,
      start,
      end,
      totalBookings
    };
  }


  static async buildHTML(data, generatedAt) {
    const dataForTemplate = {
      WeekStart: this.formatShort(data.start),
      WeekEnd: this.formatShort(data.end),
      Time: new Date(generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      Date: this.formatShort(generatedAt),
      TotalBookings: data.totalBookings
    };

    return TemplateHelper.loadAndProcessTemplate('weekly-insights-report', dataForTemplate);
  }

  static async sendForDate(targetDate = new Date()) {
    const data = await this.fetchWeeklyData(targetDate);

    // Skip sending if there are no bookings in the selected week
    if (!data.totalBookings || data.totalBookings === 0) {
      return { totalBookings: 0, skipped: true, sent: 0, failed: [], hotels: 0 };
    }

    const html = await this.buildHTML(data, new Date());

    const hotels = await Hotel.findAll({ where: { email: { [Op.ne]: null } } });

    const summary = { sent: 0, failed: [] };

    for (const hotel of hotels) {
      const toList = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      if (!toList || !toList.length) continue;

      const subject = `Weekly Insights Report – ${this.formatShort(data.start)} to ${this.formatShort(data.end)} – ${hotel.name}`;

      try {
        await EmailService.sendEmail({ to: toList, subject, html });
        summary.sent += 1;
      } catch (err) {
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: err?.message });
      }
    }

    return { totalBookings: data.totalBookings, ...summary, hotels: hotels.length };
  }
}

module.exports = WeeklyInsightsReportService;
