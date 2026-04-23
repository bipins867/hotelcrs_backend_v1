const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { Document, Hotel, Country, State, City } = require("../../db/models");
const { getSignedUrl, extractS3KeyFromUrl } = require("../../utils/s3Helper");
const { buildWhereClause } = require("../../helper/filter");
const { Op } = require("sequelize");
const { fetchAssignHotelId } = require("../common/helper");
let resourceName = "Document";

module.exports = {
  getAll: async (req, res) => {
    try {
      const { countryId, stateId, cityId, documentName, documentType, approvalStatus } = req.query;

      const filterConfig = {
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
        documentName: "like",
        documentType: "like",
        approvalStatus: "like",
        hotelId: "in",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      const wherePayload = {
        countryId,
        stateId,
        cityId,
        documentName,
        documentType,
        approvalStatus,
      };

      if (assignHotelId) {
        wherePayload.hotelId = assignHotelId;
      }

      const where = buildWhereClause(wherePayload, filterConfig);
      const data = await Document.findAll({
        where,
        include: [
          {
            model: Hotel,
            as: "hotel",
            ...(req.query.hotelName ? {
              where: {
                name: {
                  [Op.iLike]: `%${req.query.hotelName}%`,
                },
              }
            } : {}),
          },
          {
            model: Country,
            as: "country",
          },
          {
            model: State,
            as: "state",
          },
          {
            model: City,
            as: "city",
          },
        ],
      });
      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const {
        page = 1, limit = 10, orderBy = "DESC",
        countryId, stateId, cityId, documentName, documentType, approvalStatus
      } = req.query;

      const offset = (page - 1) * limit;

      const filterConfig = {
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
        documentName: "like",
        documentType: "like",
        approvalStatus: "like",
        hotelId: "in",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      const wherePayload = {
        countryId,
        stateId,
        cityId,
        documentName,
        documentType,
        approvalStatus,
      };

      if (assignHotelId) {
        wherePayload.hotelId = assignHotelId;
      }

      const where = buildWhereClause(wherePayload, filterConfig);

      const { rows: documents, count: totalRecords } =
        await Document.findAndCountAll({
          include: [
            {
              model: Hotel,
              as: "hotel",
              ...(req.query.hotelName ? {
                where: {
                  name: {
                    [Op.iLike]: `%${req.query.hotelName}%`,
                  },
                }
              } : {}),
            },
            {
              model: Country,
              as: "country",
            },
            {
              model: State,
              as: "state",
            },
            {
              model: City,
              as: "city",
            },
          ],
          where,
          offset: +offset,
          limit: +limit,
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        documents,
        totalRecords,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const {
        countryId,
        stateId,
        cityId,
        hotelId,
        documents,
        uploadedBy = req?.user?.id,
      } = req.body;

      const createdBy = req?.user?.id;

      const payload = documents.map((document) => ({
        countryId,
        stateId,
        cityId,
        hotelId,
        uploadedBy,
        documentType: document.documentType,
        documentName: document.documentName,
        filePath: document.filePath,
        approvalStatus: document.approvalStatus,
        adminComments: document.adminComments,
        createdBy,
      }));

      const data = await Document.bulkCreate(payload, {
        userId: createdBy,
        req: req
      });
      successResponse(res, `${resourceName} created successfully`, data, 201);
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Document.findByPk(id);
      if (!data) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        countryId,
        stateId,
        cityId,
        hotelId,
        documentType,
        documentName,
        filePath,
        approvalStatus,
        adminComments,
      } = req.body;

      const data = await Document.findByPk(id);
      if (!data) {
        return errorResponse(res, "Data not found", null, 404);
      }
      const updatedBy = req.user ? req.user.id : null;
      const updatedData = {
        countryId,
        stateId,
        cityId,
        hotelId,
        documentType,
        documentName,
        filePath,
        approvalStatus,
        adminComments,
        updatedBy,
      };


      await data.update(updatedData, {
        userId: updatedBy,
        req: req
      });

      successResponse(res, `${resourceName} updated successfully`, data);
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;
      await document.update({ deletedBy });
      const data = await Document.destroy({
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!data) {
        return errorResponse(res, "Data not found", null, 404);
      }
      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },

  // Generate a signed URL to view the document
  getViewSignedUrl: async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await Document.findByPk(id);
      if (!doc) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      const resolveFileKey = (filePath) => {
        if (!filePath) return null;
        let value = filePath;
        if (Array.isArray(value)) {
          value = value[0];
        }
        if (typeof value === 'object' && value !== null) {
          if (value.key) return value.key;
          if (value.fileKey) return value.fileKey;
          if (value.path) value = value.path;
          else if (value.Location) value = value.Location;
          else if (value.url) value = value.url;
        }
        if (typeof value !== 'string') {
          value = String(value);
        }
        if (value.startsWith('http')) {
          try { return extractS3KeyFromUrl(value); } catch (_) { /* fallthrough */ }
        }
        return value;
      };

      const key = resolveFileKey(doc.filePath);
      if (!key) {
        return errorResponse(res, `File path missing for ${resourceName}`, null, 400);
      }
      const url = getSignedUrl(key, 'getObject', 60 * 10); // 10 minutes

      successResponse(res, `Signed URL generated`, { url });
    } catch (error) {
      errorResponse(res, `Error generating signed URL for ${resourceName}`, error.message);
    }
  },

  // Generate a signed URL intended for download (frontend can force download)
  getDownloadSignedUrl: async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await Document.findByPk(id);
      if (!doc) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      const resolveFileKey = (filePath) => {
        if (!filePath) return null;
        let value = filePath;
        if (Array.isArray(value)) {
          value = value[0];
        }
        if (typeof value === 'object' && value !== null) {
          if (value.key) return value.key;
          if (value.fileKey) return value.fileKey;
          if (value.path) value = value.path;
          else if (value.Location) value = value.Location;
          else if (value.url) value = value.url;
        }
        if (typeof value !== 'string') {
          value = String(value);
        }
        if (value.startsWith('http')) {
          try { return extractS3KeyFromUrl(value); } catch (_) { /* fallthrough */ }
        }
        return value;
      };

      const key = resolveFileKey(doc.filePath);
      if (!key) {
        return errorResponse(res, `File path missing for ${resourceName}`, null, 400);
      }
      const url = getSignedUrl(key, 'getObject', 60 * 10);

      successResponse(res, `Signed download URL generated`, { url, suggestedFileName: doc.documentName });
    } catch (error) {
      errorResponse(res, `Error generating download URL for ${resourceName}`, error.message);
    }
  },
};
