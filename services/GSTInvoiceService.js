const { Op } = require('sequelize');
const { GSTInvoice, Reservation, Hotel, Customer, BookingDetail, Room, RatePlan, State, City, Country, TravelPartner, PaymentType } = require('../db/models');
const ReservationInvoiceService = require('./ReservationInvoiceService');
const PDFHelper = require('../utils/pdfHelper');
const { getCompanyDetails } = require('../utils/common');
const { bindReservationData } = require('../helper/reservation');
const { deleteObject } = require('../utils/s3Helper');

class GSTInvoiceService {
  static formatInvoiceNumber(date, sequence) {
    const day = String(date.getDate()).padStart(2, '0');     // 01
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 01
    const year = String(date.getFullYear()).slice(-2);       // 25
    const seq = String(sequence).padStart(6, '0');           // 000001

    return `N${day}${month}${year}W${seq}`;
  }

  static computeTaxes(baseAmount, hotelStateId, customerStateId, defaultRate = 12) {
    const rate = defaultRate / 100;
    const isIntraState = hotelStateId && customerStateId && Number(hotelStateId) === Number(customerStateId);
    if (isIntraState) {
      const half = baseAmount * (rate / 2);
      return {
        taxRate: defaultRate,
        sgstAmount: Math.round(half),
        cgstAmount: Math.round(half),
        igstAmount: 0,
        totalAmount: Number(baseAmount) + Math.round(half) * 2
      };
    }
    const igst = Math.round(baseAmount * rate);
    return {
      taxRate: defaultRate,
      sgstAmount: 0,
      cgstAmount: 0,
      igstAmount: igst,
      totalAmount: Number(baseAmount) + igst
    };
  }

  static async generateForCheckoutDate(targetDateISO) {
    const target = new Date(targetDateISO);
    const start = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    // Load reservations with all required associations for invoice generation
    const reservations = await Reservation.findAll({
      where: {
        checkoutDate: { [Op.gte]: start.toISOString().slice(0, 10), [Op.lte]: end.toISOString().slice(0, 10) },
      },
      include: [
        {
          model: BookingDetail,
          as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: "ratePlans" },
          ],
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel,
          as: "hotels",
          include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
          ],
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ]
    });

    if (!reservations.length) return { created: 0 };

    // Get company details once for all reservations
    const companyDetails = await getCompanyDetails({ includeSignedUrls: false });

    // Get the last invoice for sequence number (once for all reservations)
    const lastInvoice = await GSTInvoice.findOne({
      order: [['id', 'DESC']],
      attributes: ['id', 'invoiceNumber']
    });
    let currentSeq = lastInvoice?.id || 0;

    let created = 0;
    let pdfErrors = 0;

    for (const r of reservations) {
      try {
        const exists = await GSTInvoice.findOne({ where: { reservationId: r.id } });
        if (exists) continue;

        const baseAmount = Number(r.netAmt || 0);
        if (!baseAmount || baseAmount <= 0) continue;

        const taxes = this.computeTaxes(baseAmount, r.hotels?.stateId, r.customers?.stateId);

        // Increment sequence for each new invoice
        currentSeq += 1;
        const invoiceNumber = this.formatInvoiceNumber(target, currentSeq);

        // Prepare reservation data for invoice generation
        const boundReservation = await bindReservationData(r);
        const reservationData = {
          ...boundReservation,
          companyDetails: boundReservation.companyDetails || companyDetails
        };

        // Generate PDF invoice and upload to S3
        let pdfUrl = null;
        try {
          // Build HTML for tax invoice
          const { html } = await ReservationInvoiceService.buildHTML(reservationData, { forEmail: false, invoiceNumber: invoiceNumber });

          // Generate PDF filename: GST-Invoice-{InvoiceNumber}-{BookingId}.pdf
          const bookingId = (reservationData.bookingId || reservationData.id || 'booking').toString().replace(/[^a-zA-Z0-9]/g, '');
          const fileName = `GST-Invoice-${invoiceNumber}-${bookingId}`;

          // Generate PDF and upload to S3 (using tax bucket)
          const taxBucketName = process.env.AWS_TAX_BUCKET_NAME;
          const pdfResult = await PDFHelper.generateAndUploadPDF(html, fileName, {}, taxBucketName);
          pdfUrl = pdfResult.fileName; // Store S3 key in pdfUrl
        } catch (pdfError) {
          console.error(`Error generating PDF for reservation ${r.id}:`, pdfError);
          pdfErrors += 1;
          // Continue creating GST invoice record even if PDF generation fails
        }

        await GSTInvoice.create({
          invoiceNumber,
          reservationId: r.id,
          hotelId: r.hotelId,
          customerId: r.customerId,
          invoiceDate: target.toISOString().slice(0, 10),
          fromDate: r.checkingDate,
          toDate: r.checkoutDate,
          baseAmount,
          taxRate: taxes.taxRate,
          sgstAmount: taxes.sgstAmount,
          cgstAmount: taxes.cgstAmount,
          igstAmount: taxes.igstAmount,
          totalAmount: taxes.totalAmount,
          isSystemGenerated: true,
          pdfUrl: pdfUrl // Store S3 key
        });
        created += 1;
      } catch (error) {
        console.error(`Error processing reservation ${r.id}:`, error);
        // Continue with next reservation
      }
    }
    return { created, pdfErrors };
  }

  /**
   * Update pdfUrl for existing GST invoices that don't have a PDF
   * Processes invoices in batches to handle large datasets efficiently
   * @param {Object} options - Processing options
   * @param {number} options.batchSize - Number of invoices to process per batch (default: 50)
   * @param {number} options.limit - Maximum number of invoices to process (default: null = all)
   * @returns {Promise<{updated: number, errors: Array, skipped: number}>}
   */
  static async updateMissingPdfUrls(options = {}) {
    const { batchSize = 50, limit = null } = options;

    // Find all GST invoices without pdfUrl
    const whereClause = {
      [Op.or]: [
        { pdfUrl: null },
        { pdfUrl: '' }
      ]
    };

    const countQuery = { where: whereClause };
    const totalCount = await GSTInvoice.count(countQuery);

    if (totalCount === 0) {
      return { updated: 0, errors: [], skipped: 0, total: 0 };
    }

    const maxProcess = limit || totalCount;
    const totalBatches = Math.ceil(Math.min(maxProcess, totalCount) / batchSize);

    // Get company details once for all invoices
    const companyDetails = await getCompanyDetails({ includeSignedUrls: false });

    let updated = 0;
    let skipped = 0;
    const errors = [];
    let processed = 0;

    // Process in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * batchSize;
      const currentBatchSize = Math.min(batchSize, maxProcess - processed);

      // Fetch batch of invoices
      const invoices = await GSTInvoice.findAll({
        where: whereClause,
        limit: currentBatchSize,
        offset: offset,
        order: [['id', 'ASC']],
        include: [
          {
            model: Reservation,
            as: 'reservation',
            required: true,
            include: [
              {
                model: BookingDetail,
                as: "bookingDetails",
                include: [
                  { model: Room, as: "rooms" },
                  { model: RatePlan, as: "ratePlans" },
                ],
              },
              { model: Customer, as: "customers" },
              {
                model: Hotel,
                as: "hotels",
                include: [
                  { model: State, as: "state" },
                  { model: City, as: "city" },
                  { model: Country, as: "country" },
                ],
              },
              { model: TravelPartner, as: "travelPartner" },
              { model: PaymentType, as: "paymentTypes" },
            ]
          }
        ]
      });

      if (!invoices.length) break;

      // Process each invoice in the batch
      for (const invoice of invoices) {
        try {
          const reservation = invoice.reservation;

          if (!reservation) {
            skipped += 1;
            errors.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              error: 'Reservation not found'
            });
            console.warn(`Invoice ${invoice.invoiceNumber} (ID: ${invoice.id}) - Reservation not found, skipping...`);
            continue;
          }

          // Prepare reservation data for invoice generation
          const boundReservation = await bindReservationData(reservation);
          const reservationData = {
            ...boundReservation,
            companyDetails: boundReservation.companyDetails || companyDetails
          };

          // Generate PDF invoice and upload to S3
          let pdfUrl = null;
          try {
            // Build HTML for tax invoice
            const { html } = await ReservationInvoiceService.buildHTML(reservationData, { forEmail: false, invoiceNumber: invoice.invoiceNumber });

            // Generate PDF filename: GST-Invoice-{InvoiceNumber}-{BookingId}.pdf
            const bookingId = (reservationData.bookingId || reservationData.id || 'booking').toString().replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `GST-Invoice-${invoice.invoiceNumber}-${bookingId}`;

            // Generate PDF and upload to S3 (using tax bucket)
            const taxBucketName = process.env.AWS_TAX_BUCKET_NAME;
            const pdfResult = await PDFHelper.generateAndUploadPDF(html, fileName, {}, taxBucketName);
            pdfUrl = pdfResult.fileName; // Store S3 key in pdfUrl

            // Update invoice with pdfUrl
            await invoice.update({ pdfUrl });
            updated += 1;

          } catch (pdfError) {
            errors.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              reservationId: reservation.id,
              error: pdfError.message
            });
            skipped += 1;
          }
        } catch (error) {
          errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message
          });
          skipped += 1;
        }

        processed += 1;
      }

      // Small delay between batches to avoid overwhelming the system
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(`\n✅ PDF URL update completed!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Total Processed: ${processed}`);

    return {
      updated,
      skipped,
      errors,
      total: processed,
      totalFound: totalCount
    };
  }

  static async regenerateForBookingId(bookingId, updatedData = {}) {
    // Find the reservation
    const reservation = await Reservation.findOne({
      where: { bookingId: bookingId },
      include: [
        {
          model: BookingDetail,
          as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: "ratePlans" },
          ],
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel,
          as: "hotels",
          include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
          ],
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ]
    });

    if (!reservation) {
      throw new Error(`Reservation with Booking ID ${bookingId} not found`);
    }

    // Check for existing invoice
    let invoice = await GSTInvoice.findOne({ where: { reservationId: reservation.id } });

    // Determine Base Amount (allow override)
    const baseAmount = updatedData.baseAmount ? Number(updatedData.baseAmount) : Number(reservation.netAmt || 0);
    if (!baseAmount || baseAmount <= 0) {
      throw new Error("Invalid base amount for invoice generation");
    }

    // Compute Taxes
    const taxes = this.computeTaxes(baseAmount, reservation.hotels?.stateId, reservation.customers?.stateId);

    // Determine Invoice Number
    let invoiceNumber;
    if (invoice) {
      invoiceNumber = invoice.invoiceNumber;

      // If gst invoice data is already exists with pdfUrl then remove that file from s3 as well
      if (invoice.pdfUrl) {
        try {
          await deleteObject(invoice.pdfUrl, process.env.AWS_TAX_BUCKET_NAME);
        } catch (s3Error) {
          console.error(`Warning: Failed to delete old existing GST invoice PDF: ${invoice.pdfUrl}`, s3Error.message);
          // Continue execution as this shouldn't block regeneration
        }
      }
    } else {
      const lastInvoice = await GSTInvoice.findOne({
        order: [['id', 'DESC']],
        attributes: ['id', 'invoiceNumber']
      });
      const currentSeq = (lastInvoice?.id || 0) + 1;
      invoiceNumber = this.formatInvoiceNumber(new Date(), currentSeq);
    }

    // Get company details
    const companyDetails = await getCompanyDetails({ includeSignedUrls: false });

    // Prepare reservation data
    const boundReservation = await bindReservationData(reservation);
    const reservationData = {
      ...boundReservation,
      companyDetails: boundReservation.companyDetails || companyDetails,
      ...updatedData
    };

    // Generate PDF
    let pdfUrl = null;
    try {
      const { html } = await ReservationInvoiceService.buildHTML(reservationData, { forEmail: false, invoiceNumber: invoiceNumber });

      const bookingIdStr = (reservationData.bookingId || reservationData.id || 'booking').toString().replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `GST-Invoice-${invoiceNumber}-${bookingIdStr}`;
      const taxBucketName = process.env.AWS_TAX_BUCKET_NAME;

      const pdfResult = await PDFHelper.generateAndUploadPDF(html, fileName, {}, taxBucketName);
      pdfUrl = pdfResult.fileName;
    } catch (pdfError) {
      console.error(`Error generating PDF for regeneration of booking ${bookingId}:`, pdfError);
      throw new Error(`PDF Generation failed: ${pdfError.message}`);
    }

    // Upsert GST Invoice
    const invoiceData = {
      invoiceNumber,
      reservationId: reservation.id,
      hotelId: reservation.hotelId,
      customerId: reservation.customerId,
      invoiceDate: invoice?.invoiceDate || new Date().toISOString().slice(0, 10),
      fromDate: reservation.checkingDate,
      toDate: reservation.checkoutDate,
      baseAmount,
      taxRate: taxes.taxRate,
      sgstAmount: taxes.sgstAmount,
      cgstAmount: taxes.cgstAmount,
      igstAmount: taxes.igstAmount,
      totalAmount: taxes.totalAmount,
      isSystemGenerated: true,
      pdfUrl: pdfUrl,
      ...updatedData // Merge other manual overrides if any
    };

    if (invoice) {
      await invoice.update(invoiceData);
    } else {
      invoice = await GSTInvoice.create(invoiceData);
    }

    return invoice;
  }
}

module.exports = GSTInvoiceService;


