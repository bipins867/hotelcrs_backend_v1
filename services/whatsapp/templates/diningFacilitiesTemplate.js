const { formatTime } = require('../../../utils/common');

/**
 * Dining & Facilities WhatsApp Template
 * Template 3: Dining, Bar & Facilities Information
 */
class DiningFacilitiesTemplate {
  static format(variables) {
    return `🍽️ *Dining & Leisure Details - ${variables.hotelName}, ${variables.city}*

Dear ${variables.guestName},

We're happy to share dining and facility details for your upcoming stay or inquiry at ${variables.hotelName}:

*Restaurant & Bar Timings:*
${this.formatResturantDetails(variables)}

*Meal Charges (Per Person):*
• Breakfast ₹${variables.breakfastCost} | Lunch Veg ₹${variables.lunchVeg} / Non-Veg ₹${variables.lunchNonVeg}
• Dinner Veg ₹${variables.dinnerVeg} / Non-Veg ₹${variables.dinnerNonVeg}

*Menus & Documents:*
Restaurant Menu | Bar Menu | Hotel Itinerary

*Additional Facility Details:*
• Dining Type: ${variables.breakfastType} | Served In: ${variables.breakfastServedIn}
• Outside Food: ${variables.outsideFoodPolicy} | Menu Type: ${variables.menuType}
• Ola / Uber / Rapido: ${variables.cabAvailability}
• Restaurant Contact: ${variables.restaurantContact} | ${variables.restaurantEmail}

⚠️ *This message is shared for information only and does not confirm dining or room reservations. Timings may vary slightly. This is a system-generated message and may contain errors.*

*Contact:* +91 9954363505, 7399555566, 9999880833, 9999880803
wecare@wchotels.com
— World Choice Hotels Pvt. Ltd.`;
  }

  /**
   * Format resturant details dynamically based on database data
   * @param {Object} variables - Template variables
   * @returns {string} - Formatted resturant details string
   */
  static formatResturantDetails(variables) {
    const resturantDetails = [];
    const resturantDetailsData = variables.resturantDetails || [];
    if (resturantDetailsData.length === 0) {
      return '• Resturant Details: Contact hotel for details';
    }
    resturantDetailsData.forEach(resturant => {
      const open = formatTime(resturant.openTime);
      const close = formatTime(resturant.closeTime);
      resturantDetails.push(`• ${resturant.resturantName}: ${open} - ${close}`);
    });

    return resturantDetails.join('\n');
  }
}

module.exports = DiningFacilitiesTemplate;
