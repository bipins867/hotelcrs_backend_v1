const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { Inquiry, Hotel, User, Country, State, City } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");
const { Op } = require("sequelize");
const WhatsAppOrchestrator = require("../../services/whatsapp");
const InquiryEmailService = require("../../services/InquiryEmailService");
const whatsappConfig = require("../../config/whatsapp");
const { fetchAssignHotelId } = require("../common/helper");

let resourceName = "Inquiry";

module.exports = {
  getAll: async (req, res) => {
    try {
      const { guestName, guestEmail, status, priority, hotelId, source } = req.query;

      const filterConfig = {
        guestName: "like",
        guestEmail: "like",
        status: "exact",
        priority: "exact",
        hotelId: "exact",
        source: "like",
      };

      const whereParams = {
        guestName,
        guestEmail,
        status,
        priority,
        hotelId,
        source,
      }

      const assignHotelId = fetchAssignHotelId(req?.user);
      if (assignHotelId) {
        if (hotelId) {
          if (!assignHotelId.includes(hotelId)) {
            return errorResponse(res, "You are not authorized to fetch this hotel's inquiries", null, 403);
          }
        } else {
          filterConfig.hotelId = "in";
          whereParams.hotelId = assignHotelId;
        }
      }

      const where = buildWhereClause(whereParams, filterConfig);

      const inquiries = await Inquiry.findAll({
        where,
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
          { model: User, as: "creator" },
        ],
        order: [["createdAt", "DESC"]],
      });

      successResponse(res, `${resourceName} fetched successfully`, inquiries);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        orderBy = "DESC",
        guestName,
        guestEmail,
        whatsappNumber,
        fromDate,
        toDate,
        hotelName
      } = req.query;
      const offset = (page - 1) * limit;

      const filterConfig = {
        guestName: "like",
        guestEmail: "like",
        whatsappNumber: "like"
      };

      const whereParams = {
        guestName,
        guestEmail,
        whatsappNumber,
        fromDate,
        toDate,
      }

      const assignHotelId = fetchAssignHotelId(req?.user);
      if (assignHotelId) {
        filterConfig.hotelId = "in";
        whereParams.hotelId = assignHotelId;
      }

      const where = buildWhereClause(whereParams, filterConfig);

      // Build hotel-related filters
      const hotelWhere = {};
      if (hotelName) {
        hotelWhere.name = { [Op.iLike]: `%${hotelName}%` };
      }

      // Build date range filters
      if (fromDate && toDate) {
        where.createdAt = {
          [Op.between]: [fromDate, toDate]
        };
      } else if (fromDate) {
        where.createdAt = { [Op.gte]: fromDate };
      } else if (toDate) {
        where.createdAt = { [Op.lte]: toDate };
      }

      // Build city and state filters
      const cityWhere = {};
      const stateWhere = {};

      if (req.query.city) {
        cityWhere.name = { [Op.iLike]: `%${req.query.city}%` };
      }
      if (req.query.state) {
        stateWhere.name = { [Op.iLike]: `%${req.query.state}%` };
      }

      const { rows: inquiries, count: totalRecords } =
        await Inquiry.findAndCountAll({
          where,
          offset: +offset,
          limit: +limit,
          include: [
            {
              model: Hotel,
              as: "hotel",
              where: Object.keys(hotelWhere).length > 0 ? hotelWhere : undefined,
              include: [
                { model: Country, as: "country" },
                {
                  model: State,
                  as: "state",
                  where: Object.keys(stateWhere).length > 0 ? stateWhere : undefined,
                  required: Object.keys(stateWhere).length > 0
                },
                {
                  model: City,
                  as: "city",
                  where: Object.keys(cityWhere).length > 0 ? cityWhere : undefined,
                  required: Object.keys(cityWhere).length > 0
                }
              ]
            },
            { model: User, as: "creator" },
          ],
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);
      successResponse(res, `Inquiries fetched successfully`, {
        inquiries,
        totalRecords,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      errorResponse(res, `Error fetching inquiries`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const {
        hotelId,
        guestName,
        guestEmail,
        whatsappNumber,
        numberOfRooms,
        checkInDate,
        checkOutDate,
        adult,
        children,
        createdBy = req?.user?.id,
      } = req.body;

      // Validate required fields
      if (!hotelId || !guestName) {
        return errorResponse(res, "Hotel ID and Guest Name are required", null, 400);
      }

      // Check if hotel exists
      const hotel = await Hotel.findByPk(hotelId);
      if (!hotel) {
        return errorResponse(res, "Hotel not found", null, 404);
      }


      const inquiry = await Inquiry.create({
        hotelId,
        guestName,
        guestEmail,
        whatsappNumber,
        numberOfRooms,
        checkInDate,
        checkOutDate,
        adult,
        children,
        createdBy,
      }, {
        userId: createdBy,
        req: req
      });

      const sequence = String(inquiry.id).padStart(6, '0');
      const inquiryCode = `WQ${sequence}`;
      await inquiry.update({ inquiryCode });

      // Fetch the created inquiry with associations
      const createdInquiry = await Inquiry.findByPk(inquiry.id, {
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
          { model: User, as: "creator" },
        ],
      });

      // Send WhatsApp messages asynchronously (non-blocking)
      if (whatsappConfig.ENABLE_WHATSAPP && whatsappNumber) {
        // Use setImmediate to ensure this runs after the response is sent
        setImmediate(async () => {
          try {
            // Prepare inquiry data for WhatsApp service
            const inquiryData = {
              hotelId,
              guestName,
              guestEmail,
              whatsappNumber: `+${whatsappNumber}`,
              checkInDate,
              checkOutDate,
              adult,
              children,
              numberOfRooms,
              inquiryId: inquiry.id
            };

            // Send WhatsApp messages using the orchestrator
            const result = await WhatsAppOrchestrator.sendInquiryMessages(
              inquiryData,
              inquiryData.whatsappNumber
            );

          } catch (error) {
            console.error('Error in WhatsApp integration:', error);
          }
        });
      }

      // Send Tentative Offer Email to guest if email provided (non-blocking)
      if (guestEmail) {
        setImmediate(async () => {
          try {
            await InquiryEmailService.sendInquiryEmail(hotelId, {
              hotelId,
              guestName,
              guestEmail,
              whatsappNumber,
              numberOfRooms,
              checkInDate,
              checkOutDate,
              adult,
              children,
              inquiryId: inquiry.inquiryCode,
              inquiryCode: inquiry.inquiryCode,
            }, guestEmail);
          } catch (emailErr) {
            console.error('Failed to send inquiry email:', emailErr?.message || emailErr);
          }
        });
      }

      successResponse(res, `${resourceName} created successfully`, createdInquiry, 201);
    } catch (error) {
      console.error("Error in create controller:", error.message);
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const inquiry = await Inquiry.findByPk(id, {
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
          { model: User, as: "creator" },
          { model: User, as: "updater" },
        ],
      });

      successResponse(res, `${resourceName} fetched successfully`, inquiry);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedBy = req?.user?.id;
      const updateData = { ...req.body, updatedBy };

      const inquiry = await Inquiry.findByPk(id);
      if (!inquiry) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      // Validate hotel if hotelId is being updated
      if (updateData.hotelId && updateData.hotelId !== inquiry.hotelId) {
        const hotel = await Hotel.findByPk(updateData.hotelId);
        if (!hotel) {
          return errorResponse(res, "Hotel not found", null, 404);
        }
      }


      await inquiry.update(updateData, {
        userId: updatedBy,
        req: req
      });

      // Fetch updated inquiry with associations
      const updatedInquiry = await Inquiry.findByPk(id, {
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
          { model: User, as: "creator" },
          { model: User, as: "updater" },
        ],
      });

      successResponse(res, `${resourceName} updated successfully`, updatedInquiry);
    } catch (error) {
      console.error("Error in update controller:", error.message);
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const inquiry = await Inquiry.findByPk(id);

      if (!inquiry) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      await inquiry.destroy({
        userId: req?.user?.id,
        req: req
      });

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      console.error("Error in delete controller:", error.message);
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },

  resendEmail: async (req, res) => {
    try {
      const { id } = req.params;
      const inquiry = await Inquiry.findByPk(id, {
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
        ],
      });

      if (!inquiry) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      if (!inquiry.guestEmail) {
        return errorResponse(res, "Guest email is required to send email", null, 400);
      }

      // Respond first, then send email in background
      successResponse(res, "Email sent successfully");

      // Send email asynchronously
      setImmediate(async () => {
        try {
          await InquiryEmailService.sendInquiryEmail(inquiry.hotelId, {
            hotelId: inquiry.hotelId,
            guestName: inquiry.guestName,
            guestEmail: inquiry.guestEmail,
            whatsappNumber: inquiry.whatsappNumber,
            numberOfRooms: inquiry.numberOfRooms,
            checkInDate: inquiry.checkInDate,
            checkOutDate: inquiry.checkOutDate,
            adult: inquiry.adult,
            children: inquiry.children,
            inquiryId: inquiry.inquiryCode,
            inquiryCode: inquiry.inquiryCode,
          }, inquiry.guestEmail);
        } catch (emailErr) {
          console.error(`Failed to resend inquiry email for ID ${id}:`, emailErr?.message || emailErr);
        }
      });
    } catch (error) {
      console.error("Error in resendEmail controller:", error.message);
      errorResponse(res, `Error resending email`, error.message);
    }
  },

  resendWhatsApp: async (req, res) => {
    try {
      const { id } = req.params;
      const inquiry = await Inquiry.findByPk(id, {
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
        ],
      });

      if (!inquiry) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      if (!inquiry.whatsappNumber) {
        return errorResponse(res, "WhatsApp number is required to send WhatsApp message", null, 400);
      }

      if (!whatsappConfig.ENABLE_WHATSAPP) {
        return errorResponse(res, "WhatsApp integration is disabled", null, 400);
      }

      // Respond first, then send WhatsApp in background
      successResponse(res, "WhatsApp message sent successfully");

      // Send WhatsApp asynchronously
      setImmediate(async () => {
        try {
          const inquiryData = {
            hotelId: inquiry.hotelId,
            guestName: inquiry.guestName,
            guestEmail: inquiry.guestEmail,
            whatsappNumber: `+${inquiry.whatsappNumber}`,
            checkInDate: inquiry.checkInDate,
            checkOutDate: inquiry.checkOutDate,
            adult: inquiry.adult,
            children: inquiry.children,
            numberOfRooms: inquiry.numberOfRooms,
            inquiryId: inquiry.id
          };

          const result = await WhatsAppOrchestrator.sendInquiryMessages(
            inquiryData,
            inquiryData.whatsappNumber
          );

        } catch (whatsappErr) {
          console.error(`Failed to resend inquiry WhatsApp for ID ${id}:`, whatsappErr?.message || whatsappErr);
        }
      });
    } catch (error) {
      console.error("Error in resendWhatsApp controller:", error.message);
      errorResponse(res, `Error resending WhatsApp`, error.message);
    }
  },

  sendBoth: async (req, res) => {
    try {
      const { id } = req.params;
      const inquiry = await Inquiry.findByPk(id, {
        include: [
          {
            model: Hotel,
            as: "hotel",
            include: [
              { model: Country, as: "country" },
              { model: State, as: "state" },
              { model: City, as: "city" }
            ]
          },
        ],
      });

      if (!inquiry) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      // Respond first, then send both in background
      successResponse(res, "Email and WhatsApp sent successfully");

      // Send email asynchronously
      if (inquiry.guestEmail) {
        setImmediate(async () => {
          try {
            await InquiryEmailService.sendInquiryEmail(inquiry.hotelId, {
              hotelId: inquiry.hotelId,
              guestName: inquiry.guestName,
              guestEmail: inquiry.guestEmail,
              whatsappNumber: inquiry.whatsappNumber,
              numberOfRooms: inquiry.numberOfRooms,
              checkInDate: inquiry.checkInDate,
              checkOutDate: inquiry.checkOutDate,
              adult: inquiry.adult,
              children: inquiry.children,
              inquiryId: inquiry.inquiryCode,
              inquiryCode: inquiry.inquiryCode,
            }, inquiry.guestEmail);
          } catch (emailErr) {
            console.error(`Failed to send inquiry email for ID ${id}:`, emailErr?.message || emailErr);
          }
        });
      }

      // Send WhatsApp asynchronously
      if (inquiry.whatsappNumber && whatsappConfig.ENABLE_WHATSAPP) {
        setImmediate(async () => {
          try {
            const inquiryData = {
              hotelId: inquiry.hotelId,
              guestName: inquiry.guestName,
              guestEmail: inquiry.guestEmail,
              whatsappNumber: `+${inquiry.whatsappNumber}`,
              checkInDate: inquiry.checkInDate,
              checkOutDate: inquiry.checkOutDate,
              adult: inquiry.adult,
              children: inquiry.children,
              numberOfRooms: inquiry.numberOfRooms,
              inquiryId: inquiry.id
            };

            const result = await WhatsAppOrchestrator.sendInquiryMessages(
              inquiryData,
              inquiryData.whatsappNumber
            );

          } catch (whatsappErr) {
            console.error(`Failed to send inquiry WhatsApp for ID ${id}:`, whatsappErr?.message || whatsappErr);
          }
        });
      }
    } catch (error) {
      console.error("Error in sendBoth controller:", error.message);
      errorResponse(res, `Error sending email and WhatsApp`, error.message);
    }
  },
};
