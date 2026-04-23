/**
 * WhatsApp Service Orchestrator
 * Main entry point for WhatsApp functionality
 */

const WhatsAppService = require('./WhatsAppService');
const WhatsAppDataService = require('./dataService');
const config = require('../../config/whatsapp');

class WhatsAppOrchestrator {
  constructor() {
    this.whatsappService = new WhatsAppService();
  }

  /**
   * Send WhatsApp messages for new inquiry
   * @param {Object} inquiryData - Inquiry data
   * @param {string} whatsappNumber - WhatsApp number
   * @returns {Promise<Object>} - Results
   */
  async sendInquiryMessages(inquiryData, whatsappNumber) {
    try {
      if (!config.ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled');
        return { success: false, message: 'WhatsApp integration is disabled' };
      }

      if (!whatsappNumber) {
        console.log('No WhatsApp number provided');
        return { success: false, message: 'No WhatsApp number provided' };
      }

      console.log('Starting WhatsApp integration for inquiry:', inquiryData.inquiryId);

      // Fetch comprehensive hotel data
      const templateData = await WhatsAppDataService.fetchHotelData(
        inquiryData.hotelId,
        inquiryData
      );

      console.log('WhatsApp template data:', templateData);
      // Prepare recipients
      const recipients = [whatsappNumber];

      // Send messages to all recipients
      const result = await this.whatsappService.sendToMultipleRecipients(
        recipients,
        templateData
      );

      console.log('WhatsApp integration completed:', result);
      return result;

    } catch (error) {
      console.error('Error in WhatsApp orchestrator:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send test WhatsApp messages
   * @param {string} testNumber - Test WhatsApp number
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} - Results
   */
  async sendTestMessages(testNumber, testData) {
    try {
      console.log('Sending test WhatsApp messages...');
      
      const result = await this.whatsappService.sendInquiryTemplates(
        testNumber,
        testData
      );

      console.log('Test WhatsApp messages completed:', result);
      return result;

    } catch (error) {
      console.error('Error sending test messages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WhatsAppOrchestrator();
