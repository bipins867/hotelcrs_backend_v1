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

class Next7DaysCheckInReportService {
  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  static toYMD(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static getDateLabel(date, index) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === 2) return 'Day After Tomorrow';
    return `Day ${index + 1}`;
  }

  static groupByDay(reservations, start) {
    const map = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = this.toYMD(d);
      map.set(key, { label: this.formatShort(d), rows: [] });
    }
    for (const r of reservations) {
      const key = typeof r.checkingDate === 'string' ? r.checkingDate : this.toYMD(r.checkingDate);
      if (map.has(key)) map.get(key).rows.push(r);
    }
    return Array.from(map.values());
  }

  static async fetchReservations(start, end) {
    const startYMD = this.toYMD(start);
    const endYMD = this.toYMD(end);

    return Reservation.findAll({
      where: {
        checkingDate: { [Op.between]: [startYMD, endYMD] },
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
  }

  static renderReservationRow(r) {
    const roomType = r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(', ') || 'N/A';
    const planName = r.bookingDetails?.map((bd) => bd?.ratePlans?.name).join(', ') || 'N/A';
    const otaPartner = r.travelPartner?.partnerName || r.source || r.otaPartner || 'N/A';
    const hotelName = r.hotels?.name || 'N/A';
    const cityName = r.hotels?.city?.name || 'N/A';
    const stateName = r.hotels?.state?.name || 'N/A';
    const guestName = r.customers?.name || 'N/A';
    const guestEmail = r.customers?.email || 'N/A';
    const guestMobile = r.customers?.phone || r.customers?.mobile || 'N/A';

    return `
      <tr>
        <td>${r.bookingId || ''}</td>
        <td>${r.pnr || ''}</td>
        <td>${guestName}</td>
        <td>${r.totalAdults || 0}</td>
        <td>${r.totalChildren || 0}</td>
        <td>${r.totalNight || 0}</td>
        <td>${r.totalRooms || 0}</td>
        <td>${roomType}</td>
        <td>${planName}</td>
        <td>${TemplateHelper.formatDate(r.checkingDate, 'short')}</td>
        <td>${TemplateHelper.formatDate(r.checkoutDate, 'short')}</td>
        <td>${otaPartner}</td>
        <td>${hotelName}</td>
        <td>${cityName}</td>
        <td>${stateName}</td>
        <td>${guestMobile}</td>
        <td>${guestEmail}</td>
      </tr>`;
  }

  static renderDaySection(day) {
    const { label, rows } = day;
    const body = rows && rows.length
      ? rows.map(this.renderReservationRow.bind(this)).join('')
      : '<tr><td colspan="17" style="text-align:center">No Check-Ins Scheduled</td></tr>';
    return `
      <div class="day">
        <div class="day-title">Day – ${label}</div>
        <table>
          <thead>
            <tr>
              <th>Res. No.</th>
              <th>Ref. No.</th>
              <th>Guest Name</th>
              <th>Adults</th>
              <th>Child</th>
              <th>Nights</th>
              <th>Rooms</th>
              <th>Room Type</th>
              <th>Meal Plan</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>OTA Partner</th>
              <th>Hotel Name</th>
              <th>City</th>
              <th>State</th>
              <th>Guest Mobile</th>
              <th>Guest Email</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  static async buildHTML(hotel, days, start, end) {
    const htmlSections = days.map(this.renderDaySection.bind(this)).join('\n');
    return TemplateHelper.loadAndProcessTemplate('next7days-checkin-report', {
      HotelName: hotel.name,
      City: hotel.city?.name || '',
      State: hotel.state?.name || '',
      Date: this.formatShort(new Date()),
      EmailSentDate: this.formatShort(new Date()),
      DaysHTML: htmlSections,
    });
  }

  static groupByHotel(reservations) {
    const byHotel = new Map();
    for (const r of reservations) {
      const hotelId = r.hotelId;
      if (!byHotel.has(hotelId)) byHotel.set(hotelId, []);
      byHotel.get(hotelId).push(r);
    }
    return byHotel;
  }

  static async sendForDate(targetDate = new Date()) {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const reservations = await this.fetchReservations(start, end);
    const byHotel = this.groupByHotel(reservations);
    const hotels = await Hotel.findAll({ 
      where: { email: { [Op.ne]: null } },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }] 
    });

    const summary = { sent: 0, failed: [] };
    
    for (const hotel of hotels) {
      const rows = byHotel.get(hotel.id) || [];
      
      const toList = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      if (!toList || !toList.length) continue;

      // Skip sending if there are no reservations for this hotel in the next 7 days
      if (rows.length === 0) {
        continue;
      }

      const days = this.groupByDay(rows, start);
      
      const html = await this.buildHTML(hotel, days, start, end);
      const subject = `Next 7 Days Check-In Report - ${hotel.name}, ${hotel.city?.name}, ${hotel.state?.name} - Sent on ${this.formatShort(new Date())}`;

      try {
        await EmailService.sendEmail({ 
          to: toList,
          subject, 
          html 
        });
        summary.sent += 1;
      } catch (err) {
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: err?.message });
      }
    }

    return summary;
  }
}

module.exports = Next7DaysCheckInReportService;
