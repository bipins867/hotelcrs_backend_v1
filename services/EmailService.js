const { transporter, emailConfig } = require('../config/email');

class EmailService {
  /**
   * Send email using Amazon SES
   * @param {Object} options - Email options
   * @param {string|Array} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content (optional)
   * @param {Array} options.attachments - Email attachments (optional)
   * @returns {Promise<Object>}
   */
  static async sendEmail(options) {
    try {
      // transporter is already created and imported from config
      // console.log(options.subject, 'subject');
      // console.log(options.html, 'options');
      // console.log(options.attachments, 'options.attachments');
      // return;
      const mailOptions = {       
        from: options?.from || emailConfig.from,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        // to: 'mithleshcrs2010@gmail.com',
        cc: options?.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        attachments: options.attachments || []
      };
      
      // Log attachment info for debugging
      if (options.attachments && options.attachments.length > 0) {
        const totalSize = options.attachments.reduce((sum, att) => {
          if (typeof att.content === 'string') {
            return sum + (att.content.length * 3) / 4; // Approximate base64 size
          }
          return sum + (att.content?.length || 0);
        }, 0);
        console.log(`Sending email with ${options.attachments.length} attachments, total size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
      }
      
      const result = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error('Email sending error:', error);
      // If it's a TLS/connection error, log more details
      if (error.code === 'ESOCKET' || error.message?.includes('bad record mac')) {
        console.error('TLS/Connection error detected. This may be due to large attachments or connection issues.');
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Strip HTML tags to create plain text version
   * @param {string} html - HTML content
   * @returns {string}
   */
  static stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = EmailService; 