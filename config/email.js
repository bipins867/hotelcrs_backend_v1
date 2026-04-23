require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.AWS_SES_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.AWS_SES_USERNAME,
    pass: process.env.AWS_SES_PASSWORD,
  },
  // Add timeout settings for large attachments
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,
  socketTimeout: 300000, // 5 minutes for data transfer (PDF attachments can be large)
  // Enable keep-alive for long connections
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email transporter verification failed:', error.message);
  } else {
    console.log('✅ Email transporter is ready to send messages');
  }
});

const emailConfig = {
  from: process.env.EMAIL_FROM || 'reservations@wchotels.com',
  reservationCC: 'instantbooking@gmail.com',
  reservation: 'reservations@wchotels.com',
  adminEmail: 'narayan.gautam1@gmail.com',
  companyPrefix: 'World Choice Hotels',
  companyName: 'World Choice Hotels Pvt. Ltd.',
  companyAddress: 'WZ-2C, B1, Janakpuri, New Delhi- 110058 (India) Near Janakpuri East Metro Station',
  companyPhone: '+91 7399555588 | 7399888822 | 9954363505',
  companyEmail: 'reservations@wchotels.com',
  companyLogo: 'https://mycrs.in/themes/shadow_dancer/images/logo.png',
  companyWebsite: 'www.wchotels.com | www.worldchoicehotels.com',
  gstin: process.env.GSTIN || 'N/A',
  frontendUrl: process.env.FRONTEND_URL,
};

module.exports = { transporter, emailConfig };  