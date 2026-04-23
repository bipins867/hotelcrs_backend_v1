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

class TomorrowCheckOutReportWhatsAppService {
  static formatShort(date) {
    return TemplateHelper.formatDate(date, 'short');
  }

  static startAndEndOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
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
   * Fetch hotels with WhatsApp numbers and check-outs scheduled for tomorrow
   * @param {Date} targetDate - The date to query (default: today, tomorrow = targetDate + 1)
   * @returns {Promise<Object>} Object with hotels and check-out counts
   */
  static async fetchHotelsWithTomorrowCheckOuts(targetDate = new Date()) {
    // Get tomorrow's date
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start, end } = this.startAndEndOfDay(tomorrow);

    // Get all hotels with WhatsApp numbers
    const hotels = await Hotel.findAll({
      where: { 
        mobile: { [Op.ne]: null }
      },
      include: [{ model: City, as: 'city' }, { model: State, as: 'state' }],
    });

    // For each hotel, check if there are check-outs scheduled for tomorrow
    const hotelsWithData = [];
    for (const hotel of hotels) {
      const checkOutCount = await Reservation.count({
        where: {
          hotelId: hotel.id,
          checkoutDate: { [Op.between]: [start, end] },
          status: { [Op.notIn]: ['Cancel', 'Cancelled'] },
        },
      });

      // Include hotel if there are check-outs
      if (checkOutCount > 0) {
        hotelsWithData.push(hotel);
      }
    }

    return { hotels: hotelsWithData, tomorrow };
  }

  /**
   * Send WhatsApp notification to hotels about Tomorrow Check-Out Report
   * @param {Date} targetDate - The date to query (default: today, tomorrow = targetDate + 1)
   * @returns {Promise<Object>} Results object with counts
   */
  static async sendForDate(targetDate = new Date()) {
    if (!config.ENABLE_WHATSAPP) {
      console.log('WhatsApp integration is disabled');
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const { hotels, tomorrow } = await this.fetchHotelsWithTomorrowCheckOuts(targetDate);

    // Skip sending if there are no hotels with data
    if (!hotels || hotels.length === 0) {
      return { total: 0, sent: 0, failed: 0, errors: [], skipped: true };
    }

    const results = { total: hotels.length, sent: 0, failed: 0, errors: [] };
    const generatedTime = '23:30'; // Fixed time as per requirement
    const formattedDate = this.formatShort(tomorrow);

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
          date: tomorrow,
          time: generatedTime,
        };

        const whatsappService = new WhatsAppService();
        let successCount = 0;
        
        for (const number of whatsappNumbers) {
          try {
            const result = await whatsappService.sendTemplateMessage(number, 'tomorrowCheckOutReportHotel', whatsappVars);
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

module.exports = TomorrowCheckOutReportWhatsAppService;

