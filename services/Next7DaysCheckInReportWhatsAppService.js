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

class Next7DaysCheckInReportWhatsAppService {
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
   * Fetch hotels with WhatsApp numbers and check-ins in the next 7 days
   * @param {Date} targetDate - The date to start from (default: today)
   * @returns {Promise<Object>} Object with hotels and reservations
   */
  static async fetchHotelsWithNext7DaysCheckins(targetDate = new Date()) {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const startYMD = this.toYMD(start);
    const endYMD = this.toYMD(end);

    // Get all hotels with WhatsApp numbers
    const hotels = await Hotel.findAll({
      where: { 
        mobile: { [Op.ne]: null }
      },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }],
    });

    // For each hotel, check if there are reservations in the next 7 days
    const hotelsWithData = [];
    for (const hotel of hotels) {
      const reservationCount = await Reservation.count({
        where: {
          hotelId: hotel.id,
          checkingDate: { [Op.between]: [startYMD, endYMD] },
          status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
        },
      });

      // Include hotel if there are reservations
      if (reservationCount > 0) {
        hotelsWithData.push(hotel);
      }
    }

    return { hotels: hotelsWithData, start, end };
  }

  /**
   * Send WhatsApp notification to hotels about Next 7 Days Check-In Report
   * @param {Date} targetDate - The date to query from (default: today)
   * @returns {Promise<Object>} Results object with counts
   */
  static async sendForDate(targetDate = new Date()) {
    if (!config.ENABLE_WHATSAPP) {
      console.log('WhatsApp integration is disabled');
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const { hotels, start, end } = await this.fetchHotelsWithNext7DaysCheckins(targetDate);

    // Skip sending if there are no hotels with data
    if (!hotels || hotels.length === 0) {
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const results = { total: hotels.length, sent: 0, failed: 0, errors: [] };
    const generatedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedDate = this.formatShort(targetDate);

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
          endDate: end,
          time: generatedTime,
        };

        const whatsappService = new WhatsAppService();
        let successCount = 0;
        
        for (const number of whatsappNumbers) {
          try {
            const result = await whatsappService.sendTemplateMessage(number, 'next7DaysCheckInReportHotel', whatsappVars);
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

module.exports = Next7DaysCheckInReportWhatsAppService;

