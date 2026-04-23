const { Op } = require('sequelize');
const { Reservation, BookingDetail, Hotel, Customer, City, State, PaymentType } = require('../db/models');
const TemplateHelper = require('../utils/templateHelper');
const EmailService = require('./EmailService');
const { emailConfig } = require('../config/email');
const { getCompanyDetails } = require('../utils/common');

class CheckInReportService {
  static async generateDaysHTML(groupedByDay) {
    const daySections = [];
    for (const day of groupedByDay) {
      const { label, rows } = day;
      const hasRows = rows && rows.length > 0;
      let tableHTML = '';
      if (hasRows) {
        const rowsHTML = rows.map((r, idx) => {
          const roomType = r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(",") || 'N/A';
          const planName = r.bookingDetails?.map((bd) => bd?.ratePlans?.name).join(",") || 'N/A';
          const otaPartner = r.travelPartner?.partnerName || 'N/A';
          const hotelName = r.hotels?.name || 'N/A';
          const cityName = r.hotels?.city?.name || 'N/A';
          const stateName = r.hotels?.state?.name || 'N/A';
          const guestName = r.customers?.name || 'N/A';
          const guestEmail = r.customers?.email || 'N/A';
          const guestMobile = r.customers?.phone || r.customers?.mobile || 'N/A';

          return `
            <tr>
              <td>${r.bookingId || ''}</td>
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
        }).join('');

        tableHTML = `
          <table>
            <thead>
              <tr>
                <th>Res. No.</th>
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
            <tbody>${rowsHTML}</tbody>
          </table>`;
      } else {
        tableHTML = `<div class="note">No Check-Ins Scheduled</div>`;
      }

      daySections.push(`
        <div class="day">
          <div class="day-title">Day – ${label}</div>
          ${tableHTML}
        </div>
      `);
    }
    return daySections.join('\n');
  }

  static groupByDay(reservations, start) {
    const map = new Map();
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const label = TemplateHelper.formatDate(d, 'short');
      map.set(key, { label, rows: [] });
    }
    for (const r of reservations) {
      const key = new Date(r.checkingDate).toISOString().split('T')[0];
      if (map.has(key)) {
        map.get(key).rows.push(r);
      }
    }
    return Array.from(map.values());
  }

  static async buildHTML(reservations, startDate, endDate) {
    const daysHTML = await this.generateDaysHTML(this.groupByDay(reservations, startDate));
    const companyDetails = await getCompanyDetails({includeSignedUrls: false});

    const data = {
      companyName: companyDetails.companyName,
      companyShort: companyDetails.companyName,
      brandShort: companyDetails.companyName,
      companyPhone: companyDetails?.phones?.map((row) => row?.phone).join(', '),
      companyEmail: companyDetails?.emails?.join(', '),
      companyWebsite: 'www.wchotels.com | www.worldchoicehotels.com',
      startDate: TemplateHelper.formatDate(startDate, 'short'),
      endDate: TemplateHelper.formatDate(endDate, 'short'),
      daysHTML
    };
    return TemplateHelper.loadAndProcessTemplate('weekly-checkin-report', data);
  }

  static async fetchReservations(startDate, endDate) {
    return Reservation.findAll({
      where: {
        checkingDate: { [Op.between]: [startDate, endDate] },
        status: { [Op.notIn]: ['Cancel', 'Cancelled'] }
      },
      include: [
        { model: BookingDetail, as: 'bookingDetails' },
        { model: Hotel, as: 'hotels', include: [{ model: City, as: 'city' }, { model: State, as: 'state' }] },
        { model: Customer, as: 'customers' },
        { model: PaymentType, as: 'paymentTypes' }
      ],
      order: [['checkingDate', 'ASC']]
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

  static async sendReportEmails(startDate, endDate) {
    const reservations = await this.fetchReservations(startDate, endDate);
    
    // Fetch all hotels that have an email configured
    const hotels = await Hotel.findAll({
      where: { email: { [Op.ne]: null } },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }]
    });

    const byHotel = this.groupByHotel(reservations || []);

    const summary = { sent: 0, failed: [] };
    for (const hotel of hotels) {
      const rows = (byHotel.get(hotel.id) || []).map(r => r);
      const html = await this.buildHTML(rows, startDate, endDate);
      const toList = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      if (!toList || !toList.length) continue;
      try {
        await EmailService.sendEmail({
          to: toList,
          subject: `5 Days Guest Check-In Report (${TemplateHelper.formatDate(startDate, 'short')} to ${TemplateHelper.formatDate(endDate, 'short')})` ,
          html
        });
        summary.sent += 1;
      } catch (err) {
        console.error('Report email failed for hotel', hotel.id, hotel.name, err?.message);
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: err?.message });
        continue;
      }
    }

    return { ...summary, hotels: hotels.length };
  }
}

module.exports = CheckInReportService;


