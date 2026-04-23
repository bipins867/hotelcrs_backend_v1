'use strict';

const config = require('../config/whatsapp');
const EmailService = require('./EmailService');

class TestCronServices {
   static async sendUpcomingEmail() {
    try {
      const subject = `Test email by crons`;
      const html = '<div>Hello This is tested email by crons.</div>';

      await EmailService.sendEmail({
        to: 'mithleshcrs2010@gmail.com',
        subject,
        html
      });
    } catch (error) {
      console.error('Error sending upcoming stay email:', error);
    }
  }

  static async sendForDate(targetDate = new Date()) {
    await this.sendUpcomingEmail();
  }
}

module.exports = TestCronServices;

