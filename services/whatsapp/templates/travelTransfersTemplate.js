/**
 * Travel & Transfers WhatsApp Template
 * Template 2: Travel, Transfers & Pickup Information
 */

const { hourlyChargeTypeList } = require('../../../utils/hotelServices');

class TravelTransfersTemplate {
  static format(variables) {
    return `🚗 *Travel & Pickup Information – ${variables.hotelName}, ${variables.city}*

Dear ${variables.guestName},

Here's travel assistance information for ${variables.hotelName} to help plan your arrival:

${this.formatTransportCabDetails(variables)}

🚗 *Pick-up / Drop Charges (One Way):*
${this.formatPickupPointDetails(variables)}

🕐 *Hourly / Day Packages:*
${this.formatHourlyChargeDetails(variables)}

🏔️ *Outstation Trips (Per Day):*
${this.formatOutStationChargeDetails(variables)}

🚕 *Ola / Uber / Rapido:* ${variables.cabAvailability}

💰 *Payment:* Pay directly to driver or via secure link - ${variables.paymentLink1 || variables.paypalPaymentLink}}

⚠️ *This message is shared for information only and not a confirmed booking. Driver details will be provided once pickup is confirmed via email. This is a system-generated message and may contain errors.*

*Contact:* +91 9954363505, 7399555566, 9999880833, 9999880803
wecare@wchotels.com
— World Choice Hotels Pvt. Ltd.`;
  }

  /**
   * Format transport cab details dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted transport cab details string
   */
  static formatTransportCabDetails(variables) {
    const transportCabDetails = [];
    
    // Get transport cab details data from variables
    const transportCabDetailsData = variables.transportCabDetails || [];
    
    // Only show transport cab details that exist in database and are available
    transportCabDetailsData.forEach(transport => {
      let icon;
      if (transport.pickupPointDetails?.includes('Airport')) {
        icon = '✈️';
      } else if (transport.pickupPointDetails?.includes('Station')) {
        icon = '🚆';
      } else if (transport.pickupPointDetails?.includes('Bus')) {
        icon = '🚌';
      }
      transportCabDetails.push(`${icon} ${transport.pickupPointDetails} - ${transport.distance} km (Approx. ${transport.timeTaken} mins)`);
    });

    // If no transport cab details found, show default message
    if (transportCabDetails.length === 0) {
      return '• Transport Cab Details: Contact hotel for details';
    }

    return transportCabDetails.join('\n');
  }

  /**
   * Format pickup point details dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted pickup point details string
   */
  static formatPickupPointDetails(variables) {
    const pickupPointDetails = [];
    const pickupPointDetailsData = variables.pickupPointDetails || [];

    pickupPointDetailsData.forEach(pickupPoint => {
      pickupPointDetails.push(`• ${pickupPoint.pickupPointName}: ${pickupPoint.carType} - ₹${pickupPoint.amount} (${pickupPoint.fareType})`);
    });

    return pickupPointDetails.join('\n');
  }

  /**
   * Format hourly charge details dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted hourly charge details string
   */
  static formatHourlyChargeDetails(variables) {
    const hourlyChargeDetails = [];
    const hourlyChargeDetailsData = variables.hourlyCharge || [];
    hourlyChargeDetailsData.forEach(hourlyCharge => {
      hourlyChargeDetails.push(`• ${hourlyChargeTypeList[hourlyCharge.type]}: ${hourlyCharge.carType} - ₹${hourlyCharge.amount} (${hourlyCharge.fareType})`);
    });

    if (hourlyChargeDetails.length === 0) {
      return '• Hourly Charge Details: Contact hotel for details';
    }

  return hourlyChargeDetails.join('\n');
  }

  /**
   * Format out station charge details dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted out station charge details string
   */
  static formatOutStationChargeDetails(variables) {
    const outStationChargeDetails = [];
    const outStationChargeDetailsData = variables.outStationCharge || [];
    outStationChargeDetailsData.forEach(outStationCharge => {
      outStationChargeDetails.push(`• ${outStationCharge.type}: ${outStationCharge.carType} - ₹${outStationCharge.amount} (${outStationCharge.fareType})`);
    });

    if (outStationChargeDetails.length === 0) {
      return '• Out Station Charge Details: Contact hotel for details';
    }

    return outStationChargeDetails.join('\n');
  }
}

module.exports = TravelTransfersTemplate;
