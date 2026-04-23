/**
 * WhatsApp Templates Configuration
 * Centralized mapping of template names to HTML templates and AiSensy campaign names
 * 
 * Structure:
 * - templateName: Internal identifier used in code
 * - htmlTemplate: HTML template file name (without .html extension) in templates/whatsapp/
 * - campaignName: AiSensy campaign name
 * - type: 'text' for text messages, 'pdf' for PDF/document attachments
 * - legacyTemplateClass: Legacy template class for backward compatibility (optional)
 */

const WhatsAppTemplates = {
  // Hotel Notifications
  newBooking: {
    htmlTemplate: 'new-booking-hotel',
    campaignName: 'New_booking_hotel',
    type: 'pdf'
  },
  modifiedReservation: {
    htmlTemplate: 'modified-booking-hotel',
    campaignName: 'modified_booking_hotel_cmpn',
    type: 'pdf'
  },
  cancelledReservation: {
    htmlTemplate: 'cancelled-booking-hotel',
    campaignName: 'cancelled_booking_hotel_cmpn',
    type: 'pdf'
  },

  // Guest Notifications
  bookingConfirmationGuest: {
    htmlTemplate: 'booking-confirmation-guest',
    campaignName: 'new_booking_guest_cmpn',
    type: 'pdf'
  },
  modifiedReservationGuest: {
    htmlTemplate: 'modified-booking-guest',
    campaignName: 'modif_booking_guest_cmpn',
    type: 'pdf'
  },
  cancelledReservationGuest: {
    htmlTemplate: 'cancelled-booking-guest',
    campaignName: 'cann_booking_guest_cmpn',
    type: 'pdf'
  },
  checkinReminderGuest: {
    htmlTemplate: 'checkin-reminder-guest',
    campaignName: 'checkin_reminder_guest_1_cmpn',
    type: 'pdf'
  },
  checkoutReminderGuest: {
    htmlTemplate: 'checkout-reminder-guest',
    campaignName: 'checkout_reminder_guest_1_cmpn',
    type: 'pdf'
  },
  checkinDayReminderGuest: {
    htmlTemplate: 'checkin-day-reminder-guest',
    campaignName: '',
    type: 'pdf'
  },
  thankYouStayGuest: {
    htmlTemplate: 'thank-you-stay-guest',
    campaignName: '',
    type: 'pdf'
  },

  // Direct Payment Templates - Hotel
  directPaymentHotel: {
    htmlTemplate: 'direct-payment-hotel',
    campaignName: 'pay_at_hotel_hotel_cmpn',
    type: 'pdf'
  },
  directPaymentHotelModified: {
    htmlTemplate: 'direct-payment-hotel-modified',
    campaignName: 'pay_at_hotel_modified_hotel_cmpn',
    type: 'pdf'
  },
  directPaymentHotelCancelled: {
    htmlTemplate: 'direct-payment-hotel-cancelled',
    campaignName: 'pay_at_hotel_cancelled_hotel_cmpn',
    type: 'pdf'
  },

  // Direct Payment Templates - Guest
  directPaymentGuestCreated: {
    htmlTemplate: 'direct-payment-guest-created',
    campaignName: 'pay_at_hotel_new_guest_1_cmpn',
    type: 'pdf'
  },
  directPaymentGuestModified: {
    htmlTemplate: 'direct-payment-guest-modified',
    campaignName: 'pay_at_hotel_modified_guest_1_cmpn',
    type: 'pdf'
  },
  directPaymentGuestCancelled: {
    htmlTemplate: 'direct-payment-guest-cancelled',
    campaignName: 'pay_at_hotel_cancelled_guest_cmpn',
    type: 'pdf'
  },

  // Inquiry Templates
  hotelInfo: {
    htmlTemplate: 'hotel-info',
    campaignName: '',
    type: 'text'
  },
  travelTransfers: {
    htmlTemplate: 'travel-transfers',
    campaignName: '',
    type: 'text'
  },
  diningFacilities: {
    htmlTemplate: 'dining-facilities',
    campaignName: '',
    type: 'text'
  },
  roomTypesRates: {
    htmlTemplate: 'room-types-rates',
    campaignName: '',
    type: 'text'
  },

  // Report Templates
  dailyCheckInBookingReportHotel: {
    htmlTemplate: 'daily-checkin-booking-report-hotel',
    campaignName: '',
    type: 'text'
  },
  next7DaysCheckInReportHotel: {
    htmlTemplate: 'next-7days-checkin-report-hotel',
    campaignName: '',
    type: 'text'
  },
  tomorrowCheckOutReportHotel: {
    htmlTemplate: 'tomorrow-checkout-report-hotel',
    campaignName: '',
    type: 'text'
  }
};

/**
 * Get template configuration by template name
 * @param {string} templateName - Template name
 * @returns {Object|null} Template configuration or null if not found
 */
function getTemplateConfig(templateName) {
  return WhatsAppTemplates[templateName] || null;
}

/**
 * Get campaign name for template
 * @param {string} templateName - Template name
 * @param {boolean} isPdf - Whether to get PDF campaign name
 * @returns {string|null} Campaign name or null if not found
 */
function getCampaignName(templateName, isPdf = false) {
  const config = getTemplateConfig(templateName);
  if (!config) return null;
  return isPdf ? (config.campaignNamePdf || config.campaignName) : config.campaignName;
}

/**
 * Get HTML template file name
 * @param {string} templateName - Template name
 * @returns {string|null} HTML template file name or null if not found
 */
function getHtmlTemplate(templateName) {
  const config = getTemplateConfig(templateName);
  return config?.htmlTemplate || null;
}

/**
 * Get template type
 * @param {string} templateName - Template name
 * @returns {string|null} Template type ('text' or 'pdf') or null if not found
 */
function getTemplateType(templateName) {
  const config = getTemplateConfig(templateName);
  return config?.type || null;
}

/**
 * Get legacy template class for backward compatibility
 * @param {string} templateName - Template name
 * @returns {Object|null} Legacy template class or null if not found
 */
function getLegacyTemplateClass(templateName) {
  const config = getTemplateConfig(templateName);
  return config?.legacyTemplateClass || null;
}

module.exports = {
  WhatsAppTemplates,
  getTemplateConfig,
  getCampaignName,
  getHtmlTemplate,
  getTemplateType,
  getLegacyTemplateClass
};

