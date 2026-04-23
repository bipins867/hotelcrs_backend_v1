const { HotelInvoice, Reservation, User, Hotel, Customer } = require('../../db/models');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const EmailService = require('../../services/EmailService');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { buildWhereClause } = require('../../helper/filter');

exports.uploadInvoice = async (req, res) => {
    try {
        const { reservationId, invoiceNumber, guestName, hotelName, fileUrl, status } = req.body;
        const uploadedBy = req.user.id;

        if (!fileUrl) {
            return errorResponse(res, "Invoice file URL is required", 400);
        }

        const reservation = await Reservation.findByPk(reservationId, {
            include: [{ model: Hotel, as: 'hotels' }]
        });
        if (!reservation) {
            return errorResponse(res, "Reservation not found", 404);
        }

        const invoice = await HotelInvoice.create({
            reservationId,
            invoiceNumber,
            guestName: guestName,
            hotelName: hotelName,
            fileUrl,
            uploadedBy,
            status: status || "Pending"
        });

        // Notify Admin
        // try {
        //     const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        //     await EmailService.sendEmail({
        //         to: adminEmail,
        //         subject: 'New Hotel Invoice Uploaded',
        //         html: `<p>A new invoice has been uploaded for Booking ID <strong>${reservation.bookingId}</strong> by Hotel <strong>${reservation.hotels?.name}</strong>.</p>
        //                <p>Please review it in the Admin Panel.</p>`
        //     });
        // } catch (emailError) {
        //     console.error("Failed to send notification email", emailError);
        // }
        return successResponse(res, "Invoice uploaded successfully", invoice);
    } catch (error) {
        console.error("Upload Invoice Error:", error);
        return errorResponse(res, "Failed to upload invoice", error.message, 500);
    }
};

exports.getInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, orderBy = "DESC" } = req.query;
        const offset = (page - 1) * limit;

        const query = {
            ...req.query,
        };

        if (query?.startDate && query?.endDate) {
            query.createdAt = {
                [Op.between]: [
                    new Date(`${query.startDate}T00:00:00.000Z`),
                    new Date(`${query.endDate}T23:59:59.999Z`)
                ]
            };
        }

        const queryParams = {
            hotelId: "exact", // Filter by hotelId if associated
            invoiceNumber: "like",
            guestName: "like",
            hotelName: "like",
            status: "exact",
            createdAt: "range",
        };

        const where = buildWhereClause(query, queryParams);

        // Handle searching across multiple fields if 'search' generic param is used
        if (query.search) {
            const searchCondition = { [Op.iLike]: `%${query.search}%` };
            where[Op.or] = [
                { invoiceNumber: searchCondition },
                { guestName: searchCondition },
                { hotelName: searchCondition }
            ];
        }

        const include = [
            {
                model: Reservation,
                as: 'reservation',
                include: [
                    { model: Hotel, as: 'hotels' },
                    { model: Customer, as: 'customers' }
                ],
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['id', 'name', 'email']
            }
        ];

        if (query.hotelId) {
            include[0].where = { hotelId: query.hotelId };
            delete where.hotelId;
        }

        const { count, rows } = await HotelInvoice.findAndCountAll({
            where,
            include,
            limit: +limit,
            offset: +offset,
            order: [['createdAt', orderBy]]
        });

        return successResponse(res, "Invoices fetched successfully", {
            rows,
            totalRecords: count,
            totalPages: Math.ceil(count / limit),
            currentPage: +page,
        });

    } catch (error) {
        console.error("Get Invoices Error:", error);
        return errorResponse(res, "Failed to fetch invoices", error.message, 500);
    }
};

exports.getInvoiceDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await HotelInvoice.findByPk(id, {
            include: [
                {
                    model: Reservation,
                    as: 'reservation',
                    include: [
                        { model: Hotel, as: 'hotels' },
                        { model: Customer, as: 'customers' }
                    ],
                },
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!invoice) {
            return errorResponse(res, "Invoice not found", 404);
        }

        return successResponse(res, "Invoice details fetched successfully", invoice);
    } catch (error) {
        console.error("Get Invoice Details Error:", error);
        return errorResponse(res, "Failed to fetch invoice details", error.message, 500);
    }
};

exports.updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { reservationId, invoiceNumber, guestName, hotelName, fileUrl, status, rejectionReason } = req.body;

        if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
            return errorResponse(res, "Invalid status", 400);
        }

        const invoice = await HotelInvoice.findByPk(id, {
            include: [
                { model: Reservation, as: 'reservation', include: ['hotels'] },
                { model: User, as: 'uploader' }
            ]
        });

        if (!invoice) {
            return errorResponse(res, "Invoice not found", 404);
        }
        invoice.reservationId = reservationId || invoice.reservationId;
        invoice.invoiceNumber = invoiceNumber || invoice.invoiceNumber;
        invoice.guestName = guestName || invoice.guestName;
        invoice.hotelName = hotelName || invoice.hotelName;
        invoice.fileUrl = fileUrl || invoice.fileUrl;
        invoice.status = status || invoice.status;
        invoice.rejectionReason = rejectionReason || invoice.rejectionReason;

        await invoice.save();
        return successResponse(res, "Invoice status updated successfully", invoice);
    } catch (error) {
        console.error("Update Invoice Status Error:", error);
        return errorResponse(res, "Failed to update invoice status", error.message, 500);
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return errorResponse(res, "Invalid status", 400);
        }

        const invoice = await HotelInvoice.findByPk(id, {
            include: [
                { model: Reservation, as: 'reservation', include: ['hotels'] },
                { model: User, as: 'uploader' }
            ]
        });

        if (!invoice) {
            return errorResponse(res, "Invoice not found", 404);
        }

        invoice.status = status;
        if (status === 'Rejected') {
            invoice.rejectionReason = rejectionReason;
        } else {
            invoice.approvedAt = new Date();
        }

        await invoice.save();

        // Notify Hotel User (uploader)
        try {
            const recipientEmail = invoice.uploader?.email;
            if (recipientEmail) {
                const subject = status === 'Approved' ? 'Invoice Approved' : 'Invoice Rejected';
                let html = `<p>Your invoice for Booking ID <strong>${invoice.reservation?.bookingId}</strong> has been <strong>${status}</strong>.</p>`;
                if (status === 'Rejected') {
                    html += `<p><strong>Reason:</strong> ${rejectionReason}</p>`;
                    html += `<p>Please upload a corrected invoice.</p>`;
                }

                await EmailService.sendEmail({
                    to: recipientEmail,
                    subject,
                    html
                });
            }
        } catch (emailError) {
            console.error("Failed to send status update email", emailError);
        }

        return successResponse(res, "Invoice status updated", invoice);

    } catch (error) {
        console.error("Update Status Error:", error);
        return errorResponse(res, "Failed to update status", error.message, 500);
    }
};

exports.exportInvoices = async (req, res) => {
    try {
        const {
            status,
            startDate,
            endDate,
            hotelId
        } = req.query;

        const whereClause = {};
        if (status) whereClause.status = status;
        if (startDate && endDate) {
            whereClause.createdAt = { [Op.between]: [startDate, endDate] };
        }

        const include = [
            {
                model: Reservation,
                as: 'reservation',
                include: [
                    { model: Hotel, as: 'hotels' },
                    { model: Customer, as: 'customers' }
                ],
                where: {}
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['name']
            }
        ];

        if (hotelId) {
            include[0].where.hotelId = hotelId;
        }

        const invoices = await HotelInvoice.findAll({
            where: whereClause,
            include,
            order: [['createdAt', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Invoices');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Booking Ref', key: 'bookingId', width: 20 },
            { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
            { header: 'Hotel Name', key: 'hotelName', width: 30 },
            { header: 'Guest Name', key: 'guestName', width: 20 },
            { header: 'Uploaded By', key: 'uploadedBy', width: 20 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Rejection Reason', key: 'rejectionReason', width: 30 },
            { header: 'Approved Date', key: 'approvedAt', width: 20 },
        ];

        invoices.forEach(inv => {
            worksheet.addRow({
                id: inv.id,
                bookingId: inv.reservation?.bookingId,
                invoiceNumber: inv.invoiceNumber,
                hotelName: inv.reservation?.hotels?.name,
                guestName: `${inv.reservation?.customers?.firstName || ''} ${inv.reservation?.customers?.lastName || ''}`,
                uploadedBy: inv.uploader?.name,
                date: inv.createdAt,
                status: inv.status,
                rejectionReason: inv.rejectionReason || '',
                approvedAt: inv.approvedAt
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Invoices.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Export Error:", error);
        return errorResponse(res, "Failed to export invoices", error.message, 500);
    }
};

exports.getMissingInvoices = async (req, res) => {
    try {
        const { hotelId, startDate, endDate } = req.query;

        // 1. Get IDs of reservations with invoices
        const reservationsWithInvoices = await HotelInvoice.findAll({
            attributes: ['reservationId'],
            raw: true
        });
        const existingIds = reservationsWithInvoices.map(r => r.reservationId);

        const whereClause = {
            id: { [Op.notIn]: existingIds },
            status: { [Op.in]: ['checked-out', 'Checked Out', 'Completed'] } // Adjust based on actual status values
        };

        if (hotelId) whereClause.hotelId = hotelId;
        if (startDate && endDate) {
            whereClause.checkoutDate = { [Op.between]: [startDate, endDate] };
        }

        const missing = await Reservation.findAll({
            where: whereClause,
            include: [
                { model: Hotel, as: 'hotels' },
                { model: Customer, as: 'customers' }
            ]
        });

        return successResponse(res, "Missing invoices fetched", missing);

    } catch (error) {
        console.error("Missing Invoices Error:", error);
        return errorResponse(res, "Failed to fetch missing invoices", error.message, 500);
    }
};

exports.sendReminder = async (req, res) => {
    try {
        const { reservationId } = req.body;
        const reservation = await Reservation.findByPk(reservationId, {
            include: [{ model: Hotel, as: 'hotels' }]
        });

        if (!reservation) return errorResponse(res, "Reservation not found", 404);

        // Get hotel email
        // const hotelEmail = reservation.hotels.email; // Assuming Hotel model has email
        // For now using placeholder or if Hotel model has contact info
        const hotelEmail = reservation.hotels?.email1 || reservation.hotels?.email2 || 'hotel@example.com';

        await EmailService.sendEmail({
            to: hotelEmail,
            subject: 'Urgent: Missing Invoice for Booking ' + reservation.bookingId,
            html: `<p>Please upload the invoice for Booking <strong>${reservation.bookingId}</strong>.</p>
                   <p><a href="${process.env.FRONTEND_URL}/hotel-invoices/create">Click here to upload</a></p>`
        });

        return successResponse(res, "Reminder sent successfully");
    } catch (error) {
        return errorResponse(res, "Failed to send reminder", error.message, 500);
    }
};
