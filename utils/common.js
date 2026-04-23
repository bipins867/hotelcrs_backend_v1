const { CompanyDetails } = require('../db/models');
const { getSignedUrl, getObjectAsBase64 } = require('./s3Helper');

/**
 * Convert 24h or HH:mm string to h:mm AM/PM
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = String(timeStr).split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr ?? '0', 10);
  if (Number.isNaN(h) || h < 0 || h > 23) return timeStr;
  const hour12 = ((h + 11) % 12) + 1;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const mm = Number.isNaN(m) ? '00' : String(m).padStart(2, '0');
  return `${hour12}:${mm} ${suffix}`;
}

/**
 * Convert limited editor HTML to WhatsApp-friendly text/markdown
 * - Converts <br>, <p> to newlines
 * - Converts <b>/<strong> to *...*
 * - Converts <i>/<em> to _..._
 * - Converts lists (<ul>/<ol>/<li>) to bullet lines
 * - Strips remaining tags
 */
function editorHtmlToWhatsappText(html) {
  if (!html || typeof html !== 'string') return '';
  let text = html;
  // Normalize newlines for block elements
  text = text.replace(/<\s*br\s*\/?>/gi, '\n');
  text = text.replace(/<\s*\/p\s*>/gi, '\n');
  text = text.replace(/<\s*p\s*>/gi, '');

  // Lists
  text = text.replace(/<\s*ul\s*>/gi, '');
  text = text.replace(/<\s*\/ul\s*>/gi, '\n');
  text = text.replace(/<\s*ol\s*>/gi, '');
  text = text.replace(/<\s*\/ol\s*>/gi, '\n');
  text = text.replace(/<\s*li\s*>\s*/gi, '• ');
  text = text.replace(/\s*<\s*\/li\s*>/gi, '\n');

  // Bold/italic
  text = text.replace(/<\s*(b|strong)\s*>/gi, '*');
  text = text.replace(/<\s*\/(b|strong)\s*>/gi, '*');
  text = text.replace(/<\s*(i|em)\s*>/gi, '_');
  text = text.replace(/<\s*\/(i|em)\s*>/gi, '_');

  // Links: keep the href as plain URL, show text followed by URL
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (m, href, label) => {
    const l = (label || '').trim();
    const h = (href || '').trim();
    if (!l) return h;
    if (l === h) return h;
    return `${l} (${h})`;
  });

  // Strip any remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Fetch company details with optional signed URLs and active bank selection.
 * @param {Object} options
 * @param {boolean} [options.includeSignedUrls=true] - Include signed URLs for images
 * @param {boolean} [options.selectActiveBank=true] - Attach active bank details if present
 * @param {boolean} [options.forEmail=false] - If true, embed images as base64 for email templates
 * @returns {Promise<Object|null>} Company details object or null if not found
 */
async function getCompanyDetails(options = {}) {
  const { includeSignedUrls = true, selectActiveBank = true, forEmail = false, oldData = null } = options;
  let data = oldData;

  // If oldData is not provided or is an empty object, fallback to DB
  const isEmptyObject = data && typeof data === 'object' && Object.keys(data).length === 0;
  if (!oldData || isEmptyObject) {
    const companyInstance = await CompanyDetails.findOne();
    data = !companyInstance ? null : companyInstance.toJSON();
  }

  if (!data) {
    return null;
  }

  if (includeSignedUrls) {
    try {
      if (forEmail) {
        // For email templates, embed signature image as base64
        data.signatureImageUrl = data.signatureImage ? await getObjectAsBase64(data.signatureImage) : null;
      } else {
        // For regular use, use signed URL
        data.signatureImageUrl = data.signatureImage ? getSignedUrl(data.signatureImage) : null;
      }
    } catch (_) {
      data.signatureImageUrl = null;
    }

    try {
      if (forEmail) {
        // For email templates, embed company logo as base64
        data.companyLogoUrl = data.companyLogo ? await getObjectAsBase64(data.companyLogo) : null;
      } else {
        // For regular use, use signed URL
        data.companyLogoUrl = data.companyLogo ? getSignedUrl(data.companyLogo) : null;
      }
    } catch (_) {
      data.companyLogoUrl = null;
    }
  }

  if (selectActiveBank) {
    const banks = Array.isArray(data.bankDetails) ? data.bankDetails : [];
    data.activeBankDetails = banks.find(b => b && (b.active === true || b.isActive === true)) || banks[0] || null;
  }

  // Normalize emails/phones to arrays for consistency
  if (data.emails && !Array.isArray(data.emails)) data.emails = [data.emails];
  if (data.phones && !Array.isArray(data.phones)) data.phones = [data.phones];

  return data;
}

module.exports = {
  getCompanyDetails,
  formatTime,
  editorHtmlToWhatsappText
};


