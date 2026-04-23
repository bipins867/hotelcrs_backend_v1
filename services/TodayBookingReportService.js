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
const { emailConfig } = require('../config/email');

class TodayBookingReportService {
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

  static async fetchTodayBookings(targetDate = new Date()) {
    const { start, end } = this.startAndEndOfDay(targetDate);

    const newBookings = await Reservation.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] },
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

    return { newBookings, start, end };
  }

  static renderRow(r) {
    const roomType = r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(', ') || 'N/A';
    const planName = r.bookingDetails?.map((bd) => bd?.ratePlans?.name).join(', ') || 'N/A';
    const guestMobile = Array.isArray(r.customers?.mobile) ? r.customers.mobile[0] : (r.customers?.mobile || '');
    const guestEmail = Array.isArray(r.customers?.email) ? r.customers.email[0] : (r.customers?.email || '');
    const hotelName = r.hotels?.name || '';
    const city = r.hotels?.city?.name || '';
    const state = r.hotels?.state?.name || '';
    const payable = r.totalPayableAmount != null ? r.totalPayableAmount : r.netAmt;

    return `
      <tr>
        <td>${r.bookingId || ''}</td>
        <td>${r.pnr || ''}</td>
        <td>${r.customers?.name || 'N/A'}</td>
        <td>${r.totalAdults || 0}</td>
        <td>${r.totalChildren || 0}</td>
        <td>${r.totalNight || 0}</td>
        <td>${roomType}</td>
        <td>${r.totalRooms || 0}</td>
        <td>${planName}</td>
        <td>${TemplateHelper.formatDate(r.checkingDate, 'short')}</td>
        <td>${TemplateHelper.formatDate(r.checkoutDate, 'short')}</td>
        <td>${r.travelPartner?.partnerName || r.source || r.otaPartner || '—'}</td>
        <td>${r.status || ''}</td>
        <td>${hotelName}</td>
        <td>${city}</td>
        <td>${state}</td>
        <td>${guestMobile || ''}</td>
        <td>${guestEmail || ''}</td>
        <td>₹ ${payable != null ? Number(payable).toLocaleString('en-IN') : '-'}</td>
      </tr>
    `;
  }

  static renderTable(rowsHTML) {
    const headers = [
      'Res. No.', 'Ref. No.', 'Guest Name', 'Adults', 'Children', 'Nights',
      'Room Type', 'Rooms', 'Meal Plan', 'Check-In', 'Check-Out', 'OTA Partner',
      'Booking Status', 'Hotel Name', 'City', 'State', 'Guest Mobile', 'Guest Email', 'Payable to Hotel'
    ];
    return `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${rowsHTML || '<tr><td colspan="19" style="text-align:center">No bookings created today</td></tr>'}
        </tbody>
      </table>
    `;
  }

  static async buildHTML(bookings, generatedAt) {
    const rows = bookings.map((r) => this.renderRow(r)).join('');
    const table = this.renderTable(rows);

    const dataForTemplate = {
      Date: this.formatShort(generatedAt),
      Time: new Date(generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      BookingTable: table,
    };

    return TemplateHelper.loadAndProcessTemplate('daily-booking-report', dataForTemplate);
  }

  static async sendForDate(targetDate = new Date()) {
    const { newBookings, start } = await this.fetchTodayBookings(targetDate);

    // Skip sending if there are no bookings created today
    if (!newBookings || newBookings.length === 0) {
      return { count: 0, skipped: true };
    }

    const html = await this.buildHTML(newBookings, new Date());
    const subject = `Daily Booking Report – ${this.formatShort(start)}`;

    // Destination: central reservations. Adjust to use config if needed
    const to = emailConfig.adminEmail;

    await EmailService.sendEmail({ to, subject, html });

    return { count: newBookings.length };
  }
}

module.exports = TodayBookingReportService;


