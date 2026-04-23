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

class TomorrowCheckOutReportService {
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

  static async fetchTomorrowCheckOuts(targetDate = new Date()) {
    // Get tomorrow's date
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start, end } = this.startAndEndOfDay(tomorrow);

    const checkOuts = await Reservation.findAll({
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

    return { checkOuts, start, end };
  }

  static renderRow(r) {
    const roomType = r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(', ') || 'N/A';
    const planName = r.bookingDetails?.map((bd) => bd?.ratePlans?.name).join(', ') || 'N/A';
    const guestMobile = Array.isArray(r.customers?.mobile) ? r.customers.mobile[0] : (r.customers?.mobile || '');
    const guestEmail = Array.isArray(r.customers?.email) ? r.customers.email[0] : (r.customers?.email || '');
    const hotelName = r.hotels?.name || '';
    const city = r.hotels?.city?.name || '';
    const state = r.hotels?.state?.name || '';

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
        <td>${hotelName}</td>
        <td>${city}</td>
        <td>${state}</td>
        <td>${guestMobile || ''}</td>
        <td>${guestEmail || ''}</td>
      </tr>
    `;
  }

  static renderTable(rowsHTML) {
    const headers = [
      'Res. No.', 'Ref. No.', 'Guest Name', 'Adults', 'Children', 'Nights',
      'Room Type', 'Rooms', 'Meal Plan', 'Check-In', 'Check-Out', 'OTA Partner',
      'Hotel Name', 'City', 'State', 'Guest Mobile', 'Guest Email'
    ];
    return `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${rowsHTML || '<tr><td colspan="17" style="text-align:center">No check-outs scheduled for tomorrow</td></tr>'}
        </tbody>
      </table>
    `;
  }

  static async buildHTML(checkOuts, generatedAt) {
    const rows = checkOuts.map((r) => this.renderRow(r)).join('');
    const table = this.renderTable(rows);

    // Get tomorrow's date for display
    const tomorrow = new Date(generatedAt);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dataForTemplate = {
      Date: this.formatShort(tomorrow),
      Time: new Date(generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      CheckOutTable: table,
    };

    return TemplateHelper.loadAndProcessTemplate('tomorrow-checkout-report', dataForTemplate);
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
    const { checkOuts, start } = await this.fetchTomorrowCheckOuts(targetDate);

    // Fetch hotels that have an email configured
    const hotels = await Hotel.findAll({
      where: { email: { [Op.ne]: null } },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }],
    });

    const checkOutsByHotel = this.groupByHotel(checkOuts);

    const summary = { sent: 0, failed: [] };

    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const hotel of hotels) {
      const toList = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      if (!toList || !toList.length) continue;

      const hotelCheckOuts = checkOutsByHotel.get(hotel.id) || [];
      // Skip sending if there are no check-outs for this hotel tomorrow
      if (!hotelCheckOuts.length) {
        continue;
      }
      const html = await this.buildHTML(hotelCheckOuts, new Date());

      const subject = `Tomorrow Check-Out Report – ${this.formatShort(tomorrow)} – ${hotel.name}, ${hotel.city?.name || ''}, ${hotel.state?.name || ''}`;

      try {
        await EmailService.sendEmail({ to: toList, subject, html });
        summary.sent += 1;
      } catch (err) {
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: err?.message });
      }
    }

    return { ...summary, hotels: hotels.length, totalCheckOuts: checkOuts.length };
  }
}

module.exports = TomorrowCheckOutReportService;
