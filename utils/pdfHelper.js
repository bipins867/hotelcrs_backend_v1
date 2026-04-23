const puppeteer = require('puppeteer');
const s3 = require('../config/aws');
const path = require('path');

class PDFHelper {
  /**
   * Generate PDF from HTML content using Puppeteer
   * @param {string} html - HTML content to convert to PDF
   * @param {Object} options - PDF generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generatePDFFromHTML(html, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Overcome limited resource problems
          '--disable-accelerated-2d-canvas',
          '--disable-gpu' // Disable GPU for faster rendering
        ]
      });
      const page = await browser.newPage();
      
      // Set viewport to match template width (896px max-width container)
      // Using viewport that matches the actual layout
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2 // Higher DPI for better quality
      });

      // Inject minimal print-optimized CSS for PDF rendering
      // Templates now contain all styling, we only need PDF-specific adjustments
      let enhancedHtml = html;
      const printStyles = `
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          table {
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          td, th {
            page-break-inside: avoid !important;
          }
        </style>
      `;
      
      if (html.includes('</head>')) {
        enhancedHtml = html.replace('</head>', printStyles + '</head>');
      } else {
        enhancedHtml = `<head>${printStyles}</head>` + html;
      }

      // Set content and wait for images/resources to load
      await page.setContent(enhancedHtml, { 
        waitUntil: 'load',
        timeout: 30000
      });

      // Wait for all images to load explicitly (handles both base64 data URIs and URLs)
      await page.evaluate(() => {
        const images = Array.from(document.images).filter(img => img.src && img.src.trim() !== '');
        if (images.length === 0) {
          return Promise.resolve();
        }
        
        return Promise.all(
          images.map((img) => {
            // If image is already loaded (base64 images load immediately)
            if (img.complete && img.naturalHeight !== 0) {
              return Promise.resolve();
            }
            
            // For base64 data URIs, they should load immediately
            if (img.src && img.src.startsWith('data:')) {
              // Give a small delay for base64 images to render
              return new Promise((resolve) => {
                setTimeout(resolve, 200);
              });
            }
            
            // For URL-based images, wait for load or error
            return new Promise((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve(); // Continue even if image fails
              // Timeout after 10 seconds per image
              setTimeout(resolve, 10000);
            });
          })
        );
      });

      // Additional wait for fonts and rendering
      await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      });

      // Generate PDF with A4 format matching the invoice layout
      // The 896px container will be centered on the page with proper margins
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: options.margin || {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        scale: options.scale || 1,
        // Ensure colors and backgrounds are printed
        omitBackground: false
      });

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Upload PDF buffer to S3
   * @param {Buffer} pdfBuffer - PDF buffer to upload
   * @param {string} fileName - File name for S3
   * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
   * @returns {Promise<string>} S3 URL of uploaded file
   */
  static async uploadPDFToS3(pdfBuffer, fileName, bucketName = null) {
    try {
      const params = {
        Bucket: bucketName || process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ACL: 'private' // Make it private, use signed URLs if needed
      };

      const data = await s3.upload(params).promise();
      return data.Location;
    } catch (error) {
      console.error('Error uploading PDF to S3:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF from HTML and upload to S3
   * @param {string} html - HTML content
   * @param {string} fileName - Desired file name (will be sanitized)
   * @param {Object} pdfOptions - PDF generation options
   * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
   * @returns {Promise<Object>} Object with pdfBuffer and s3Url
   */
  static async generateAndUploadPDF(html, fileName, pdfOptions = {}, bucketName = null) {
    try {
      // Sanitize filename
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const uniqueFileName = `invoices/${timestamp}-${sanitizedFileName}.pdf`;

      // Generate PDF
      const pdfBuffer = await this.generatePDFFromHTML(html, pdfOptions);

      // Upload to S3
      const s3Url = await this.uploadPDFToS3(pdfBuffer, uniqueFileName, bucketName);

      return {
        pdfBuffer,
        s3Url,
        fileName: uniqueFileName
      };
    } catch (error) {
      console.error('Error generating and uploading PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF attachment object for nodemailer
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} filename - Filename for attachment
   * @returns {Object} Nodemailer attachment object
   */
  static createPDFAttachment(pdfBuffer, filename) {
    return {
      filename: filename,
      content: pdfBuffer,
      contentType: 'application/pdf'
    };
  }
}

module.exports = PDFHelper;

