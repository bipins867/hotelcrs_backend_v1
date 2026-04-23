'use strict';

const { Op } = require('sequelize');
const {
  Reservation,
  BookingDetail,
  Room,
  RatePlan,
  Customer,
  Hotel,
  State,
  City,
  Country,
  FinancialInformation,
  Policy,
  Commission,
  TravelPartner,
  PaymentType,
  GSTInvoice
} = require('../db/models');
const TemplateHelper = require('../utils/templateHelper');
const EmailService = require('./EmailService');
const PDFHelper = require('../utils/pdfHelper');
const { downloadObjectAsBuffer } = require('../utils/s3Helper');
const { groupHotels, groupHotelsByHotelId } = require('../helper/reservation');

class GuestCheckoutReportService {
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

  static formatDDMMYYYY(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${month}${year}`;
  }

  /**
   * Fetch reservations that checked out on the target date
   */
  static async fetchTodayCheckOuts(targetDate = new Date()) {
    const dateString = targetDate.toISOString().split('T')[0];

    const checkOuts = await Reservation.findAll({
      where: {
        checkoutDate: dateString,
        status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
      },
      include: [
        { model: BookingDetail, as: "bookingDetails", 
          include: [
            { model: Room, as: "rooms"}, 
            { model: RatePlan, as: 'ratePlans' }
          ] 
        },
      { model: Customer, as: "customers" },
      { model: Hotel, as: "hotels", include: [
        { model: State, as: "state" }, 
        { model: City, as: "city" }, 
        { model: Country, as: "country" },
        { model: FinancialInformation, as: "financialInformation" }, 
        { model: Policy, as: "policy" },
        { model: Commission, as: "commission" }
      ]},
      { model: TravelPartner, as: "travelPartner" },
      { model: PaymentType, as: "paymentTypes" },
      ],
      distinct: true,
      order: [['id', 'ASC']],
    });

    return { checkOuts };
  }

  /**
   * Group reservations by hotel
   */
  static groupByHotel(reservations) {
    const map = new Map();
    for (const r of reservations) {
      const hotelId = r.hotelId;
      if (!map.has(hotelId)) map.set(hotelId, []);
      map.get(hotelId).push(r);
    }
    return map;
  }

  /**
   * Get GST invoice PDF from database and S3
   */
  static async getGSTInvoicePDF(reservation) {
    try {
      // Get GST Invoice for this reservation
      const gstInvoice = await GSTInvoice.findOne({
        where: { reservationId: reservation.id },
        attributes: ['invoiceNumber', 'pdfUrl']
      });

      if (!gstInvoice || !gstInvoice.pdfUrl) {
        return null;
      }

      // Download PDF from S3 (using tax bucket)
      const pdfBuffer = await downloadObjectAsBuffer(
        gstInvoice.pdfUrl,
        process.env.AWS_TAX_BUCKET_NAME
      );

      // Generate filename
      const guestName = (reservation.customers?.name || 'Guest').replace(/[^a-zA-Z0-9]/g, '');
      const checkoutDate = this.formatDDMMYYYY(reservation.checkoutDate);
      const fileName = `${reservation.bookingId}-${guestName}-${checkoutDate} (GST Invoice).pdf`;

      return {
        pdfBuffer,
        fileName,
        invoiceNumber: gstInvoice.invoiceNumber
      };
    } catch (error) {
      console.error(`Error getting GST invoice PDF for reservation ${reservation.id}:`, error);
      return null;
    }
  }

  /**
   * Build email HTML for guest checkout summary report
   */
  static async buildCheckoutReportHTML(hotel, reservations, targetDate) {
    const companyDetails = reservations[0]?.companyDetails;
    
      // Build guest table rows
      const guestRows = reservations.map((r) => {
        const roomType = r.bookingDetails?.map((bd) => bd?.rooms?.roomName).join(', ') || 'N/A';
        const paymentType = r.paymentTypes?.name || 'N/A';
        const checkIn = this.formatShort(r.checkingDate);
        const checkOut = this.formatDDMMYYYY(r.checkoutDate);
        const guestName = (r.customers?.name || 'Guest').replace(/[^a-zA-Z0-9]/g, '');
        const gstInvoiceName = `${r.bookingId}-${guestName}-${checkOut} (GST Invoice).pdf`;
        
        return `
          <tr>
            <td>${r.customers?.name || 'N/A'}</td>
            <td>${r.bookingId || ''}</td>
            <td>${paymentType}</td>
            <td>${checkIn}</td>
            <td>${this.formatShort(r.checkoutDate)}</td>
            <td>${roomType}</td>
            <td>${r.totalRooms || 0}</td>
            <td>${r.totalAdults || 0} Adults, ${r.totalChildren || 0} Children</td>
            <td>${gstInvoiceName}</td>
          </tr>
        `;
      }).join('');

    // Calculate totals
    const totalGuests = reservations.length;
    const totalRooms = reservations.reduce((sum, r) => sum + (r.totalRooms || 0), 0);
    const totalNights = reservations.reduce((sum, r) => sum + (r.totalNight || 0), 0);

    // GSTIN mapping
    const gstinMap = {
      'Rajasthan': '08AABCW7108D1ZI',
      'Haryana': '06AABCW7108D1ZM',
      'Karnataka': '29AABCW7108D1ZE',
      'Meghalaya': '17AABCW7108D1ZJ',
      'Uttar Pradesh': '09AABCW7108D1ZG',
      'Arunachal Pradesh': '12AABCW7108D1ZT',
      'Delhi': '07AABCW7108D1ZK',
      'West Bengal': '19AABCW7108D1ZF',
      'Assam': '18AABCW7108D1ZH'
    };

    const hotelState = hotel.state?.name || '';
    const applicableGstin = gstinMap[hotelState] || '';

    const dataForTemplate = {
      Hotel_Name: hotel.name || '',
      City: hotel.city?.name || '',
      State: hotel.state?.name || '',
      Country: hotel.country?.name || '',
      Hotel_Contact_Person: hotel.contactPerson || 'Team',
      Hotel_Email: Array.isArray(hotel.email) ? hotel.email.join(', ') : (hotel.email || ''),
      Hotel_Phone: Array.isArray(hotel.phone) ? hotel.phone.join(', ') : (hotel.phone || ''),
      Date: this.formatShort(targetDate),
      Time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      GuestTableRows: guestRows,
      Total_Guests: totalGuests,
      Total_Rooms: totalRooms,
      Total_Nights: totalNights,
      Applicable_GSTIN: applicableGstin,
      Hotel_State: hotelState,
      Company_Name: companyDetails?.companyName || 'World Choice Hotels Pvt. Ltd.',
      Company_Address: companyDetails?.address || 'Samta Enclave, Near Mother Dairy, Qutub Vihar, Phase 1, Sector 19 Dwarka, New Delhi – 110071, India',
      GSTIN_Table: Object.entries(gstinMap).map(([state, gstin]) => 
        `<tr><td>${state}</td><td>${gstin}</td><td>Active</td></tr>`
      ).join('')
    };

    return TemplateHelper.loadAndProcessTemplate('guest-checkout-summary-report', dataForTemplate);
  }

  /**
   * Send checkout report and invoices to hotels
   */
  static async sendForDate(targetDate = new Date()) {
    const { checkOuts } = await this.fetchTodayCheckOuts(targetDate);

    if (!checkOuts || checkOuts.length === 0) {
      return { sent: 0, failed: [], skipped: true };
    }

    const checkOutsByHotel = await groupHotelsByHotelId(checkOuts);
    const hotels = await groupHotels(checkOuts);
    const summary = { sent: 0, failed: [] };

    for (const hotel of hotels) {
      const reservations = checkOutsByHotel.get(hotel.id) || [];
      if (reservations.length === 0) continue;

      const toList = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      if (!toList || !toList.length) {
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: 'No email address' });
        continue;
      }

      try {
        // Get GST invoice PDFs for all reservations
        const attachments = [];
        const invoicePromises = reservations.map(async (reservation) => {
          try {
            const invoiceResult = await this.getGSTInvoicePDF(reservation);
            if (invoiceResult) {
              return PDFHelper.createPDFAttachment(
                invoiceResult.pdfBuffer,
                invoiceResult.fileName
              );
            }
            return null;
          } catch (invoiceError) {
            console.error(`Error getting GST invoice PDF for reservation ${reservation.id}:`, invoiceError);
            return null;
          }
        });

        // Wait for all invoices to download
        const invoiceResults = await Promise.allSettled(invoicePromises);
        invoiceResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            attachments.push(result.value);
          }
        });

        // Build email HTML
        const html = await this.buildCheckoutReportHTML(hotel, reservations, targetDate);
        const formattedDate = this.formatShort(targetDate);
        const subject = `Guest Checkout Report & Invoices – Check Out On ${formattedDate} – ${hotel.name}, ${hotel.city?.name || ''}, ${hotel.state?.name || ''}`;

        // Send email with attachments (with increased timeout)
        await EmailService.sendEmail({ 
          to: toList, 
          subject, 
          html,
          attachments 
        });

        summary.sent++;
      } catch (err) {
        console.error(`Error sending checkout report for hotel ${hotel.id}:`, err);
        summary.failed.push({ hotelId: hotel.id, hotelName: hotel.name, error: err?.message });
      }
    }

    return summary;
  }
}

module.exports = GuestCheckoutReportService;

