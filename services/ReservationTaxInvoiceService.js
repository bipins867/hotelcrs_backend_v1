'use strict';

const {
    GSTInvoice,
} = require('../db/models');
const TemplateHelper = require('../utils/templateHelper');
const EmailService = require('./EmailService');
const PDFHelper = require('../utils/pdfHelper');
const { bindReservationData } = require('../helper/reservation');
const { downloadObjectAsBuffer } = require('../utils/s3Helper');
const { emailConfig } = require('../config/email');

class ReservationTaxInvoiceService {
    /**
     * Format date for display
     */
    static formatShort(date) {
        return TemplateHelper.formatDate(date, 'DDMMYYYY');
    }

    /**
     * Retrieve GST Invoice PDF from S3
     */
    static async getInvoicePDF(reservation) {
        try {
            // Find the GST Invoice record for this reservation
            const gstInvoice = await GSTInvoice.findOne({
                where: { reservationId: reservation.id },
                attributes: ['id', 'invoiceNumber', 'pdfUrl']
            });

            if (!gstInvoice || !gstInvoice.pdfUrl) {
                console.warn(`GST Invoice or PDF URL not found for reservation ${reservation.id}`);
                return null;
            }

            // Download PDF from S3
            const pdfBuffer = await downloadObjectAsBuffer(
                gstInvoice.pdfUrl,
                process.env.AWS_TAX_BUCKET_NAME
            );

            const fileName = `Tax-Invoice-${gstInvoice.invoiceNumber || reservation.bookingId || reservation.id}.pdf`;

            return {
                pdfBuffer,
                fileName
            };

        } catch (error) {
            console.error(`Error retrieving invoice PDF for reservation ${reservation.id}:`, error);
            return null; // Return null to allow email without attachment or handle failure gracefully
        }
    }

    /**
     * Build email HTML for tax invoice
     */
    static async buildTaxInvoiceEmailHTML(boundReservation) {

        // Prepare standardized template data
        // We can use the helper or manually map to specific template needs
        // The previous implementation used TemplateHelper.prepareCommonData implicitly via manual mapping in controller
        // Let's stick to the manual mapping to ensure exact match with the template created

        const data = {
            hotelName: boundReservation?.hotels?.name || '',
            hotelAddress: boundReservation?.hotels?.address || '',
            checkInDate: this.formatShort(boundReservation?.checkingDate),
            checkOutDate: this.formatShort(boundReservation?.checkoutDate),
            totalRooms: boundReservation?.totalRooms || 0,
            numberOfGuests: boundReservation?.totalAdults || 0 + boundReservation?.totalChildren || 0,
            totalNight: boundReservation?.totalNight || 0,
            customerName: boundReservation?.customers?.name || '',
            companyName: emailConfig?.companyName,
            companyPhone: emailConfig?.companyPhone,
            companyPrefix: emailConfig?.companyPrefix
        }
        console.log(data, 'data');
        // return;

        return TemplateHelper.loadAndProcessTemplate('reservation-tax-invoice-body', data);
    }

    /**
     * Send tax invoice email to a customer for a single reservation
     */
    static async sendTaxInvoice(reservation) {
        try {
            // Bind reservation data (handling oldData snapshot logic)
            const boundReservation = await bindReservationData(reservation);

            // Check if customer email exists
            if (!boundReservation.customers?.email) {
                return {
                    success: false,
                    error: 'Customer email not found',
                    reservationId: reservation.id,
                    bookingId: boundReservation.bookingId
                };
            }

            // Retrieval of PDF Attachment
            let attachment = null;
            try {
                const invoiceResult = await this.getInvoicePDF(boundReservation);
                if (invoiceResult) {
                    attachment = PDFHelper.createPDFAttachment(invoiceResult?.pdfBuffer, invoiceResult?.fileName);
                }
            } catch (invoiceError) {
                console.error(`Error retrieving attachment for ${reservation.id}:`, invoiceError);
            }

            // Build Email HTML
            const html = await this.buildTaxInvoiceEmailHTML(boundReservation);

            // Prepare Subject
            const subject = `Tax Invoice - Booking ${boundReservation.bookingId} - Guest Name: ${boundReservation.customers.name}, Check In : ${this.formatShort(boundReservation.checkingDate)}, Hotel Name: ${boundReservation.hotels.name}, ${boundReservation.hotels.city.name}, ${boundReservation.hotels.state.name}`;

            // Prepare recipients
            const customerEmails = Array.isArray(boundReservation.customers.email)
                ? boundReservation.customers.email
                : [boundReservation.customers.email];

            // Send Email
            await EmailService.sendEmail({
                to: customerEmails,
                subject: subject,
                html: html,
                attachments: attachment ? [attachment] : []
            });

            return {
                success: true,
                reservationId: reservation.id,
                bookingId: boundReservation.bookingId
            };

        } catch (error) {
            console.error(`Error sending tax invoice email for reservation ${reservation.id}:`, error);
            return {
                success: false,
                error: error.message,
                reservationId: reservation.id,
                bookingId: reservation.bookingId
            };
        }
    }
}

module.exports = ReservationTaxInvoiceService;
