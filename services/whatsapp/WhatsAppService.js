/**
 * WhatsApp Service
 * Handles WhatsApp message sending using Twilio
 */

const config = require('../../config/whatsapp');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const PDFHelper = require('../../utils/pdfHelper');
const s3 = require('../../config/aws');
const TemplateHelper = require('../../utils/templateHelper');
const {
  getCampaignName,
  getHtmlTemplate,
  getLegacyTemplateClass
} = require('../../config/whatsappTemplates');
const { toStringArray } = require('../../helper');

class WhatsAppService {

  /**
   * Send WhatsApp message
   * @param {string} to - Recipient WhatsApp number
   * @param {string} message - Message content
   * @returns {Promise<Object>} - Result object
   */

  async sendMessage(to, campaignName, templateParams) {
    try {
      return;
      if (!campaignName || !to || !templateParams) return false;

      const payload = {
        apiKey: config.AISENSY_API_KEY,
        campaignName,
        destination: to,
        userName: 'world choice hotels',
        templateParams: toStringArray(templateParams),
        source: config.AISENSY_SOURCE
      };

      const response = await axios.post(
        config.AISENSY_API_URL,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      return {
        success: true,
        messageId: response.data.messageId || null,
        status: 'sent'
      };
    } catch (error) {
      console.error('AiSensy WhatsApp Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send template message
   * @param {string} to - Recipient WhatsApp number
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} - Result object
   */
  async sendTemplateMessage(to, templateName, variables) {
    try {
      // Get template configuration
      const campaignName = getCampaignName(templateName);
      const legacyTemplateClass = getLegacyTemplateClass(templateName);

      if (!legacyTemplateClass) {
        throw new Error(`Template configuration not found for: ${templateName}`);
      }

      // Format template parameters using legacy template class
      const templateParams = legacyTemplateClass.format(variables);

      // Send message(s)
      if (Array.isArray(to)) {
        const results = [];
        for (const number of to) {
          const result = await this.sendMessage(number, campaignName, templateParams);
          results.push({ number, ...result });
          await new Promise(r => setTimeout(r, 300));
        }
        return {
          success: results.some(r => r.success),
          results
        };
      } else {
        return await this.sendMessage(to, campaignName, templateParams);
      }
      
    } catch (error) {
      console.error('Error sending template message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send all inquiry templates
   * @param {string} to - Recipient WhatsApp number
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} - Results of all messages
   */
  async sendInquiryTemplates(to, variables) {
    try {
      const templates = [
        { name: 'hotelInfo', label: 'Hotel Information' },
        { name: 'travelTransfers', label: 'Travel & Transfers' },
        { name: 'diningFacilities', label: 'Dining & Facilities' },
        { name: 'roomTypesRates', label: 'Room Types & Rates' }
      ];

      const results = [];

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        
        const result = await this.sendTemplateMessage(to, template.name, variables);
        
        results.push({
          template: template.name,
          label: template.label,
          ...result
        });

        // Add delay between messages to avoid rate limiting
        if (i < templates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, config.WHATSAPP_DELAY_BETWEEN_MESSAGES));
        }
      }

      return {
        success: true,
        totalTemplates: templates.length,
        results
      };
    } catch (error) {
      console.error('Error sending inquiry templates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send WhatsApp messages to multiple recipients
   * @param {Array<string>} recipients - Array of WhatsApp numbers
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} - Results for all recipients
   */
  async sendToMultipleRecipients(recipients, variables) {
    try {
      const results = [];

      for (const recipient of recipients) {
        const result = await this.sendInquiryTemplates(recipient, variables);
        results.push({
          recipient,
          ...result
        });
      }

      return {
        success: true,
        totalRecipients: recipients.length,
        results
      };
    } catch (error) {
      console.error('Error sending to multiple recipients:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load and process WhatsApp HTML template
   * @param {string} templateName - Template file name (without extension)
   * @param {Object} data - Data object for template replacement
   * @returns {Promise<string>} Processed HTML content
   */
  async loadAndProcessWhatsAppTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '..', '..', 'templates', 'whatsapp', `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      return TemplateHelper.processTemplate(templateContent, data);
    } catch (error) {
      console.error(`Error loading WhatsApp template ${templateName}:`, error);
      throw new Error(`WhatsApp template ${templateName} not found or could not be loaded`);
    }
  }

  /**
   * Upload PDF to S3 temporarily with public read access for WhatsApp
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} fileName - File name
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @returns {Promise<Object>} Object with url and s3Key
   */
  async uploadPDFToS3Temporary(pdfBuffer, fileName, maxRetries = 3) {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const s3Key = `whatsapp-pdfs/${timestamp}-${sanitizedFileName}.pdf`;
    const bucketName = process.env.AWS_TEMP_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'eu-north-1';

    if (!bucketName) {
      throw new Error('AWS_TEMP_BUCKET_NAME environment variable is not set');
    }

    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'public-read' // Public read for AiSensy access
    };

    // Retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Uploading PDF to S3 (Attempt ${attempt}/${maxRetries}): Bucket=${bucketName}, Key=${s3Key}, Region=${region}, Size=${pdfBuffer.length} bytes`);
        
        // Use managedUpload with proper configuration
        const upload = s3.upload(params, {
          partSize: 10 * 1024 * 1024, // 10MB parts for large files
          queueSize: 1, // Upload parts sequentially
          timeout: 300000 // 5 minutes timeout
        });

        const data = await upload.promise();
        
        // Ensure URL uses correct region format
        let pdfUrl = data.Location;
        
        // If URL doesn't match expected region, reconstruct it
        const expectedRegion = region;
        const urlPattern = new RegExp(`s3[.-]${expectedRegion}\\.amazonaws\\.com`);
        
        if (!urlPattern.test(pdfUrl)) {
          // Reconstruct URL with correct region
          const bucketBaseUrl = `https://${bucketName}.s3.${expectedRegion}.amazonaws.com`;
          pdfUrl = `${bucketBaseUrl}/${s3Key}`;
          console.log(`Reconstructed URL with correct region: ${pdfUrl}`);
        }
        
        console.log(`PDF uploaded successfully. URL: ${pdfUrl}`);
        
        return {
          url: pdfUrl,
          s3Key: s3Key,
          fileName: `${sanitizedFileName}.pdf`
        };
      } catch (error) {
        lastError = error;
        const isRetryable = error.code === 'TimeoutError' || 
                          error.code === 'ECONNRESET' || 
                          error.code === 'ETIMEDOUT' ||
                          error.retryable === true;
        
        if (attempt < maxRetries && isRetryable) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          console.warn(`S3 upload attempt ${attempt} failed (${error.code || error.message}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`S3 upload failed after ${attempt} attempt(s):`, {
            message: error.message,
            code: error.code,
            region: error.region,
            requestId: error.requestId,
            retryable: error.retryable
          });
          throw new Error(`S3 upload failed after ${attempt} attempt(s): ${error.message}`);
        }
      }
    }
    
    // Should never reach here, but just in case
    throw new Error(`S3 upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Delete PDF from S3
   * @param {string} s3Key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
  async deletePDFFromS3(s3Key) {
    try {
      const bucketName = process.env.AWS_TEMP_BUCKET_NAME;

      if (!bucketName) {
        throw new Error('AWS_TEMP_BUCKET_NAME environment variable is not set');
      }

      const params = {
        Bucket: bucketName,
        Key: s3Key
      };

      await s3.deleteObject(params).promise();
      console.log(`PDF deleted from S3: ${s3Key}`);
      return true;
    } catch (error) {
      console.error('Error deleting PDF from S3:', error);
      return false;
    }
  }

  /**
   * Send PDF document via WhatsApp using AiSensy
   * Note: AiSensy API requires a publicly accessible URL - buffers/base64 are NOT supported
   * @param {string} to - Recipient WhatsApp number
   * @param {string} campaignName - AiSensy campaign name (document template)
   * @param {string} pdfUrl - Public URL of the PDF document (required)
   * @param {Array} templateParams - Optional template parameters for the message
   * @param {string} fileName - Optional PDF file name (default: 'document.pdf')
   * @returns {Promise<Object>} Result object
   */
  async sendPDFDocument(to, campaignName, pdfUrl, templateParams = [], fileName = 'document.pdf') {
    try {
      if (!campaignName || !to || !pdfUrl) {
        return { success: false, error: 'Missing required parameters: campaignName, to, or pdfUrl' };
      }

      // IMPORTANT: AiSensy requires a publicly accessible HTTP/HTTPS URL
      const payload = {
        apiKey: config.AISENSY_API_KEY,
        campaignName,
        destination: to,
        userName: 'world choice hotels',
        media: {
          url: pdfUrl,
          filename: fileName
        },
        templateParams: toStringArray(templateParams),
        source: config.AISENSY_SOURCE
      };

      console.log('Sending PDF via AiSensy:', { campaignName, to, pdfUrl, fileName });

      const response = await axios.post(
        config.AISENSY_API_URL,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return {
        success: true,
        messageId: response.data.messageId || null,
        status: 'sent',
        pdfUrl,
        fileName
      };
    } catch (error) {
      console.error('AiSensy PDF WhatsApp Error:', error);
      if (error.response) {
        console.error('AiSensy API Error Response:', error.response.data);
      }
      return {
        success: false,
        error: error.message,
        apiError: error.response?.data || null
      };
    }
  }

  /**
   * Generate PDF from HTML template and send via WhatsApp
   * Note: Uploads PDF to S3 temporarily and deletes after 5 minutes
   * @param {string} to - Recipient WhatsApp number
   * @param {string} templateName - Internal template name (e.g., 'newBooking')
   * @param {Object} templateData - Data for template processing
   * @param {string} filePrefix - Optional file name prefix (auto-generated if not provided)
   * @param {Object} options - Options object
   * @param {Object} options.pdfOptions - PDF generation options
   * @param {boolean} options.deleteAfterSend - Delete PDF from S3 after sending (default: true)
   * @returns {Promise<Object>} Result object
   */
  async generateAndSendPDF(to, templateName, templateData, filePrefix = null, options = {}) {
    try {
      const { pdfOptions = {}, deleteAfterSend = true, templateParams = [] } = options;

      // Get template configuration
      const htmlTemplateName = getHtmlTemplate(templateName);
      const campaignName = getCampaignName(templateName, true); // Get PDF campaign name

      if (!htmlTemplateName) {
        throw new Error(`HTML template not found for: ${templateName}`);
      }

      if (!campaignName) {
        throw new Error(`Campaign name not found for: ${templateName}`);
      }

      // Generate file name
      const bookingId = templateData.bookingId || templateData.id || 'booking';
      const fileName = filePrefix ? `${filePrefix}-${bookingId}` : `${templateName}-${bookingId}`;

      // Load and process HTML template
      const htmlContent = await this.loadAndProcessWhatsAppTemplate(htmlTemplateName, templateData);

      // Generate PDF buffer
      const pdfBuffer = await PDFHelper.generatePDFFromHTML(htmlContent, pdfOptions);

      // Upload PDF to S3 temporarily with public access
      const s3Result = await this.uploadPDFToS3Temporary(pdfBuffer, fileName);

      // Send PDF via WhatsApp with media object
      const result = await this.sendPDFDocument(to, campaignName, s3Result.url, templateParams, fileName);

      // Delete PDF from S3 after 5 minutes (300000ms) to ensure AiSensy has time to fetch it
      if (deleteAfterSend && result.success) {
        setTimeout(async () => {
          await this.deletePDFFromS3(s3Result.s3Key);
        }, 300000); // Delete after 5 minutes
      }

      return {
        ...result,
        pdfUrl: s3Result.url,
        s3Key: s3Result.s3Key,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error generating and sending PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppService;
