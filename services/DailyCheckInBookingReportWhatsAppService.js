'use strict';

const { Op } = require('sequelize');
const {
  Reservation,
  Hotel,
  City,
  State,
} = require('../db/models');
const TemplateHelper = require('../utils/templateHelper');
const WhatsAppService = require('./whatsapp/WhatsAppService');
const config = require('../config/whatsapp');

class DailyCheckInBookingReportWhatsAppService {
  /**
   * Get hotel WhatsApp number(s)
   * @param {Object} hotel - Hotel object
   * @returns {Array<string>} Array of WhatsApp numbers
   */
  static getHotelWhatsAppNumbers(hotel) {
    const numbers = [];

    // Check mobile field (JSON array)
    if (hotel?.mobile) {
      const mobileArray = Array.isArray(hotel.mobile) ? hotel.mobile : [hotel.mobile];
      mobileArray.forEach((mobile) => {
        if (mobile && mobile.trim() && mobile.trim() !== 'N/A') {
          const formattedMobile = mobile.startsWith('+') ? mobile : mobile.startsWith('91') ? `+${mobile}` : `+91${mobile}`;
          if (!numbers.includes(formattedMobile)) {
            numbers.push(formattedMobile);
          }
        }
      });
    }

    return numbers;
  }

  /**
   * Fetch hotels that have WhatsApp numbers and check-in data for today
   * @param {Date} targetDate - The date to query
   * @returns {Promise<Object>} Object with hotels and check-in counts
   */
  static async fetchHotelsWithCheckins(targetDate = new Date()) {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    // Get all hotels with WhatsApp numbers
    const hotels = await Hotel.findAll({
      where: { 
        mobile: { [Op.ne]: null }
      },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }],
    });

    // For each hotel, check if there's any check-in data
    const hotelsWithData = [];
    for (const hotel of hotels) {
      // Check for check-ins, new bookings, or cancellations on this date
      const [checkins, newBookings, cancelled] = await Promise.all([
        Reservation.count({
          where: {
            hotelId: hotel.id,
            checkingDate: { [Op.between]: [start, end] },
            status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
          },
        }),
        Reservation.count({
          where: {
            hotelId: hotel.id,
            createdAt: { [Op.between]: [start, end] },
            status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
          },
        }),
        Reservation.count({
          where: {
            hotelId: hotel.id,
            status: { [Op.in]: ['Cancel', 'Cancelled'] },
            updatedAt: { [Op.between]: [start, end] },
          },
        }),
      ]);

      // Include hotel if there's any relevant data
      if (checkins > 0 || newBookings > 0 || cancelled > 0) {
        hotelsWithData.push(hotel);
      }
    }

    return { hotels: hotelsWithData, start, end };
  }

  /**
   * Send WhatsApp notification to hotels about daily check-in & booking report
   * @param {Date} targetDate - The date to query (default: today)
   * @returns {Promise<Object>} Results object with counts
   */
  static async sendForDate(targetDate = new Date()) {
    if (!config.ENABLE_WHATSAPP) {
      console.log('WhatsApp integration is disabled');
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const { hotels } = await this.fetchHotelsWithCheckins(targetDate);

    // Skip sending if there are no hotels with data
    if (!hotels || hotels.length === 0) {
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const results = { total: hotels.length, sent: 0, failed: 0, errors: [] };
    const generatedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

    for (const hotel of hotels) {
      try {
        const whatsappNumbers = this.getHotelWhatsAppNumbers(hotel);
        if (whatsappNumbers.length === 0) {
          continue;
        }

        const whatsappVars = {
          hotelName: hotel.name || 'Hotel',
          city: hotel.city?.name || '',
          state: hotel.state?.name || '',
          date: targetDate,
          time: generatedTime,
        };

        const whatsappService = new WhatsAppService();
        let successCount = 0;
        
        for (const number of whatsappNumbers) {
          try {
            const result = await whatsappService.sendTemplateMessage(number, 'dailyCheckInBookingReportHotel', whatsappVars);
            if (result.success) {
              successCount++;
            }
          } catch (waErr) {
            console.error(`Failed to send WhatsApp to ${number} for hotel ${hotel.id}:`, waErr.message);
          }
        }

        if (successCount > 0) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ 
            hotelId: hotel.id, 
            hotelName: hotel.name,
            error: 'Failed to send to all WhatsApp numbers' 
          });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ 
          hotelId: hotel.id, 
          hotelName: hotel.name,
          error: err?.message || 'Unknown error' 
        });
      }
    }

    return results;
  }
}

module.exports = DailyCheckInBookingReportWhatsAppService;

