/**
 * Script to update pdfUrl for existing GST invoices that don't have PDFs
 * 
 * Usage:
 *   node run-update-gst-pdfs.js                    # Process all invoices (default batch size: 50)
 *   node run-update-gst-pdfs.js 100                # Process with batch size of 100
 *   node run-update-gst-pdfs.js 50 500            # Batch size 50, limit to 500 invoices
 */

require('dotenv').config();
const GSTInvoiceService = require('./services/GSTInvoiceService');

async function main() {
  try {
    const batchSize = parseInt(process.argv[2]) || 50;
    const limit = process.argv[3] ? parseInt(process.argv[3]) : null;

    console.log('Starting PDF URL update for GST invoices...');
    console.log(`Batch size: ${batchSize}`);
    if (limit) {
      console.log(`Limit: ${limit} invoices`);
    } else {
      console.log('Processing all invoices without PDFs');
    }
    console.log('');

    const result = await GSTInvoiceService.updateMissingPdfUrls({
      batchSize,
      limit
    });

    console.log('\n=== Final Results ===');
    console.log(`Total found: ${result.totalFound}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      result.errors.slice(0, 20).forEach((err, idx) => {
        console.log(`${idx + 1}. Invoice ${err.invoiceNumber} (ID: ${err.invoiceId})`);
        console.log(`   Error: ${err.error}`);
      });
      if (result.errors.length > 20) {
        console.log(`... and ${result.errors.length - 20} more errors`);
      }
    }

    console.log('\n✅ PDF URL update completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating PDF URLs:', error);
    process.exit(1);
  }
}

main();

