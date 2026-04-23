const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { HotelMedia } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Hotel Media';

const createHotelMedia = async (req, res) => {
  const { hotelId, description, photos, videos, youtubeUrls, propertyChain } = req.body;
  const createdBy = req.user ? req.user.id : null;

  const newMedia = await HotelMedia.create({
    hotelId,
    createdBy,
    description,
    photos,
    videos,
    youtubeUrls,
    propertyChain,
  }, {
    userId: createdBy,
    req: req
  });

  return newMedia;
};

module.exports = {
  getAll: async (req, res) => {
    try {
      const mediaItems = await HotelMedia.findAll();
      successResponse(res, `${resourceName} fetched successfully`, mediaItems);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, orderBy = 'DESC' } = req.query;
      const offset = (page - 1) * limit;

      const filterConfig = {
        description: 'like',
        propertyChain: 'like',
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: mediaItems, count: totalRecords } = await HotelMedia.findAndCountAll({
        where,
        offset: +offset,
        limit: +limit,
        order: [['createdAt', orderBy]],
      });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        mediaItems,
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
      const newMedia = await createHotelMedia(req, res);
      successResponse(res, `${resourceName} created successfully`, newMedia, 201);
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const mediaItem = await HotelMedia.findByPk(id);

      if (!mediaItem) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} fetched successfully`, mediaItem);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { hotelId, description, photos, videos, youtubeUrls, propertyChain } = req.body;
      const updatedBy = req.user ? req.user.id : null;

      const mediaItem = await HotelMedia.findOne({ where: { hotelId } });

      const updatedData = {
        hotelId,
        updatedBy,
        description,
        photos,
        videos,
        youtubeUrls,
        propertyChain,
      };

      if (mediaItem) {
        await mediaItem.update(updatedData, {
          userId: updatedBy,
          req: req
        });
        successResponse(res, `${resourceName} updated successfully`, mediaItem);
      } else {
        const newMedia = await createHotelMedia(req, res);
        successResponse(res, `${resourceName} created successfully`, newMedia, 201);
      }
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;
      
      const deleted = await HotelMedia.destroy({ 
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!deleted) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
