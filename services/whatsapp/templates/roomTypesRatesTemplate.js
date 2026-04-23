/**
 * Room Types & Rates WhatsApp Template
 * Template 4: Room Types, Rate Plans & Stay Summary
 */

class RoomTypesRatesTemplate {
  static format(variables) {
    return `🏠 *Room Options & Stay Details - ${variables.hotelName}, ${variables.city}, ${variables.state}*

Dear ${variables.guestName},

Here's an overview of available rooms and plans for your selected dates:

📅 *Check-In:* ${variables.checkInDate} | *Check-Out:* ${variables.checkOutDate}
🛏️ *Nights:* ${variables.noOfNights} | *Rooms:* ${variables.numberOfRooms}

*Room Categories:* ${variables.roomCategories || 'Contact hotel for details'} (Subject to Availability)

${this.formatRoomRates(variables)}

📄 *Estimated Total:* ₹${variables.estimatedTotal} (${variables.noOfNights} nights, ${variables.numberOfRooms} rooms)

🔗 *Links:*
• Secure Payment Link: ${variables.paymentLink1}
• Paypal Payment Link (Foreign Guest): ${variables.paypalPaymentLink}
• Google Maps: ${variables.googleMaps}
• Photos: ${variables.photos}
• Videos: ${variables.videos}

⚠️ *This message is shared for reference only. It does not confirm a booking. Confirmation and final rates will be provided via official email once payment and availability are verified. This is a system-generated message and may contain errors.*

*Contact:* +91 9954363505, 9999880833, 9999880803
wecare@wchotels.com
— World Choice Hotels Pvt. Ltd.`;
  }

  /**
   * Format room rates dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted room rates string
   */
  static formatRoomRates(variables) {
    const detailed = variables.roomRatesDetailed;
    if (!detailed || Object.keys(detailed).length === 0) {
      return `💰 *Room Rates:*\n• Contact hotel for current rates and availability`;
    }

    let out = '';
    Object.keys(detailed).forEach(roomType => {
      out += `💰 *${roomType} Room:*\n`;
      const rows = detailed[roomType];
      rows.forEach(row => {
        const inclusionText = row.inclusions && row.inclusions.length ? ` (${row.inclusions.join(', ')})` : '';
        const sgl = row.sgl != null ? `₹${row.sgl}` : '-';
        const dbl = row.dbl != null ? `₹${row.dbl}` : '-';
        const extraAdult = row.extraAdult != null ? `₹${row.extraAdult}` : '-';
        const extraChild = row.extraChild != null ? `₹${row.extraChild}` : '-';
        out += `• ${row.ratePlanName}${inclusionText}: ${sgl} | ${dbl} | ${extraAdult} | ${extraChild}\n`;
      });
      out += '\n';
    });
    return out.trim();
  }
}

module.exports = RoomTypesRatesTemplate;
