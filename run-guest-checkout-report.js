require('dotenv').config();
const GuestCheckoutReportService = require('./services/GuestCheckoutReportService');

(async () => {
  try {
    console.log('Running Guest Checkout Report & Invoices...');
    const targetDate = new Date();
    const result = await GuestCheckoutReportService.sendForDate(targetDate);
    
    if (result.skipped) {
      console.log('Guest Checkout Report & Invoices skipped: No checkouts found');
    } else {
      console.log(`Guest Checkout Report & Invoices sent: ${result.sent} hotels, ${result.failed?.length || 0} failed`);
      if (result.failed && result.failed.length > 0) {
        console.log('Failed hotels:', result.failed);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('Guest Checkout Report & Invoices failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

