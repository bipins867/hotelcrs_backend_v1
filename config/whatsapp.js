require('dotenv').config();

module.exports = {
  // Twilio WhatsApp Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886', // Twilio sandbox number
  
  // WhatsApp Settings
  ENABLE_WHATSAPP: process.env.ENABLE_WHATSAPP === 'true' || false,
  WHATSAPP_DELAY_BETWEEN_MESSAGES: parseInt(process.env.WHATSAPP_DELAY_BETWEEN_MESSAGES) || 2000, // 2 seconds

  AISENSY_API_KEY: process.env.AISENSY_API_KEY,
  AISENSY_API_URL: 'https://backend.aisensy.com/campaign/t1/api/v2',
  AISENSY_SOURCE: 'hotel_backend'
};
