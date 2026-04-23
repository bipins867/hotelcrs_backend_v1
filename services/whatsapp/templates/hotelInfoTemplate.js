/**
 * Hotel Information WhatsApp Template
 * Template 1: Hotel Information, Policies, and Services
 */

const { formatTime, editorHtmlToWhatsappText } = require('../../../utils/common');

class HotelInfoTemplate {
  static format(variables) {
    return `🏨 *Hotel Information - ${variables.hotelName}, ${variables.city}, ${variables.state}*

Dear ${variables.guestName},

Thank you for your inquiry and interest in ${variables.hotelName}, located at ${variables.hotelAddress}, ${variables.city}, ${variables.state}.

📍 *Location:* View on Google Maps
📸 *Hotel Photos* | 🎥 *Hotel Videos*

*Check-In & Check-Out:*
• Check-In: ${formatTime(variables.checkInTime)} | Check-Out: ${formatTime(variables.checkOutTime)}
• Last Check-In: ${formatTime(variables.lastCheckInTime)} | Last Check-Out: ${formatTime(variables.lastCheckOutTime)}
• Early Check-In: ${variables.earlyCheckInOption} (₹${variables.earlyCheckInCharge})
• Late Check-Out: ${variables.lateCheckOutOption} (₹${variables.lateCheckOutCharge})

*Guest & Child Policy:*
• Minimum Check-In Age: ${variables.checkInAge} for Primary Guest
• Child up to ${variables.childAgeFree} free; ${variables.childAgeChargeable} charged ₹${variables.childCharge}
• Extra Bed / Person: ₹${variables.extraPersonCharge}

*Documents Accepted:*
${variables.documentsAccepted}

*Other Policies:*
• Pet Policy: ${variables.petPolicy}
• Unmarried Couples: ${variables.unmarriedCouplePolicy}
• Local Guests: ${variables.localGuestPolicy}
• Visitors in Room: ${variables.visitorPolicy}

*Services:*
${this.formatServices(variables)}

*Special Note:*
${editorHtmlToWhatsappText(variables.specialNote)}

⚠️ *This message is shared for information purposes only and is not a booking confirmation. Official confirmation will be sent via email once booking is finalized. This is a system-generated message and may contain errors.*

*Contact:* +91 9954363505, 7399555566, 9999880833, 9999880803, 7399888822
wecare@wchotels.com
— World Choice Hotels Pvt. Ltd.`;
  }

  /**
   * Format services dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted services string
   */
  static formatServices(variables) {
    const services = [];
    
    // Get services data from variables
    const servicesData = variables.services || {};
    
    // Only show services that exist in database and are available
    Object.keys(servicesData).forEach(serviceId => {
      const service = servicesData[serviceId];
      if (service && service.availability === 'Available') {
        services.push(`• ${service.label}: ${service.availability} (${service.type})`);
      }
    });

    // If no services found, show default message
    if (services.length === 0) {
      return '• Services: Contact hotel for details';
    }

    return services.join('\n');
  }
}

module.exports = HotelInfoTemplate;
