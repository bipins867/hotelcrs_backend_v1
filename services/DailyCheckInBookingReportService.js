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

class DailyCheckInBookingReportService {
  static startOfDayISO(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  static endOfDayISO(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  static async fetchDailyData(targetDate = new Date()) {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const [checkins, newBookings, cancelled] = await Promise.all([
      Reservation.findAll({
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
      }),

      Reservation.findAll({
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
      }),

      Reservation.findAll({
        where: {
          status: { [Op.in]: ['Cancel', 'Cancelled'] },
          updatedAt: { [Op.between]: [start, end] },
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
      }),
    ]);

    return { checkins, newBookings, cancelled, start, end };
  }

  static renderReservationRow(r) {
    const roomType = r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(', ') || 'N/A';
    const planName = r.bookingDetails?.map((bd) => bd?.ratePlans?.name).join(', ') || 'N/A';
    const paymentType = r.paymentTypes?.name || 'N/A';
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
        <td>${paymentType}</td>
        <td>${r.status || ''}</td>
      </tr>
    `;
  }

  static renderTable(headers, rowsHTML) {
    return `
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rowsHTML || '<tr><td colspan="13" style="text-align:center">No records</td></tr>'}
        </tbody>
      </table>
    `;
  }

  static async buildHTML(hotel, data, generatedAt) {
    const company = await getCompanyDetails({ includeSignedUrls: false });

    const checkinRows = (data.checkinsByHotel.get(hotel.id) || []).map((r) => this.renderReservationRow(r)).join('');
    const newRows = (data.newBookingsByHotel.get(hotel.id) || []).map((r) => this.renderReservationRow(r)).join('');
    const cancelledRows = (data.cancelledByHotel.get(hotel.id) || []).map((r) => this.renderReservationRow(r)).join('');

    const checkinTable = this.renderTable([
      'Res. No.', 'Ref. No.', 'Guest Name', 'Adults', 'Child', 'Nights', 'Room Type', 'Rooms', 'Meal Plan', 'Check-In', 'Check-Out', 'Payment Type', 'Status'
    ], checkinRows);

    const newTable = this.renderTable([
      'Res. No.', 'Ref. No.', 'Guest Name', 'Adults', 'Child', 'Nights', 'Room Type', 'Rooms', 'Meal Plan', 'Check-In', 'Check-Out', 'Payment Type', 'Status'
    ], newRows);

    const cancelledTable = this.renderTable([
      'Res. No.', 'Ref. No.', 'Guest Name', 'Room Type', 'Check-In', 'Check-Out', 'Reason', 'Status'
    ], (data.cancelledByHotel.get(hotel.id) || []).map((r) => `
      <tr>
        <td>${r.bookingId || ''}</td>
        <td>${r.pnr || ''}</td>
        <td>${r.customers?.name || 'N/A'}</td>
        <td>${r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(', ') || 'N/A'}</td>
        <td>${TemplateHelper.formatDate(r.checkingDate, 'short')}</td>
        <td>${TemplateHelper.formatDate(r.checkoutDate, 'short')}</td>
        <td>${r.customerNote || r.adminNote || r.hotelNote || '—'}</td>
        <td>${r.status || ''}</td>
      </tr>
    `).join(''));

    const dataForTemplate = {
      CompanyName: company.companyName,
      HotelName: hotel.name,
      City: hotel.city?.name || '',
      State: hotel.state?.name || '',
      Date: this.formatShort(generatedAt),
      Time: new Date(generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      EmailSentDate: this.formatShort(generatedAt),
      CheckinSection: checkinTable,
      NewBookingSection: newTable,
      CancelledSection: cancelledTable,
    };

    return TemplateHelper.loadAndProcessTemplate('daily-checkin-booking-report', dataForTemplate);
  }

  static groupByHotel(list) {
    const map = new Map();
    for (const r of list) {
      const hotelId = r.hotelId;
      if (!map.has(hotelId)) map.set(hotelId, []);
      map.get(hotelId).push(r);
    }
    return map;
  }

  static async sendForDate(targetDate = new Date()) {
    const { checkins, newBookings, cancelled, start, end } = await this.fetchDailyData(targetDate);

    const hotels = await Hotel.findAll({
      where: { email: { [Op.ne]: null } },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }],
    });

    const checkinsByHotel = this.groupByHotel(checkins);
    const newBookingsByHotel = this.groupByHotel(newBookings);
    const cancelledByHotel = this.groupByHotel(cancelled);

    const summary = { sent: 0, failed: [] };

    for (const hotel of hotels) {
      const toList = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      if (!toList || !toList.length) continue;

      // Skip sending email if there is no data for this hotel
      const checkinsForHotel = checkinsByHotel.get(hotel.id) || [];
      const newBookingsForHotel = newBookingsByHotel.get(hotel.id) || [];
      const cancelledForHotel = cancelledByHotel.get(hotel.id) || [];
      if (
        checkinsForHotel.length === 0 &&
        newBookingsForHotel.length === 0 &&
        cancelledForHotel.length === 0
      ) {
        continue;
      }

      const html = await this.buildHTML(hotel, { checkinsByHotel, newBookingsByHotel, cancelledByHotel }, new Date());

      const subject = `Daily Check-In & Booking Report – ${this.formatShort(start)} – ${hotel.name}, ${hotel.city?.name}, ${hotel.state?.name} – Sent on ${this.formatShort(new Date())}`;

      try {
        await EmailService.sendEmail({ to: toList, subject, html });
        summary.sent += 1;
      } catch (err) {
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: err?.message });
      }
    }

    return { ...summary, hotels: hotels.length };
  }
}

module.exports = DailyCheckInBookingReportService;


