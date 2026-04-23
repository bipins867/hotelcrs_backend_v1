const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { HotelDetails } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Hotel Details';

const createHotelDetails = async (req, res) => {
    const { hotelId, starRating, numberOfBuildings, numberOfFloors, status } = req.body;
    const createdBy = req.user ? req.user.id : null;

    const newHotelDetail = await HotelDetails.create({
        hotelId,
        createdBy,
        starRating,
        numberOfBuildings,
        numberOfFloors,
        status,
        isDraft: false
    }, {
        userId: createdBy,
        req: req
    });

    return newHotelDetail;
};

module.exports = {
    getAll: async (req, res) => {
        try {
            const hotelDetails = await HotelDetails.findAll();
            successResponse(res, `${resourceName} fetched successfully`, hotelDetails);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, orderBy = 'DESC' } = req.query;
            const offset = (page - 1) * limit;

            const filterConfig = {
                starRating: '=',
                status: '=',
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: hotelDetails, count: totalRecords } = await HotelDetails.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]],
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                hotelDetails,
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
            const newHotelDetail = await createHotelDetails(req, res);
            successResponse(res, `${resourceName} created successfully`, newHotelDetail, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const hotelDetail = await HotelDetails.findByPk(id);

            if (!hotelDetail) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            successResponse(res, `${resourceName} fetched successfully`, hotelDetail);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { hotelId, starRating, numberOfBuildings, numberOfFloors, status } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const hotelDetail = await HotelDetails.findOne({ where: { hotelId } });

            const updatedData = {
                updatedBy,
                starRating,
                numberOfBuildings,
                numberOfFloors,
                status,
                isDraft: false,
            };

            if (hotelDetail) {
                await hotelDetail.update(updatedData, {
                    userId: updatedBy,
                    req: req
                });
                successResponse(res, `${resourceName} updated successfully`, hotelDetail);
            } else {
                const newHotelDetail = await createHotelDetails(req, res);
                successResponse(res, `${resourceName} created successfully`, newHotelDetail, 201);
            }
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const deleted = await HotelDetails.destroy({ 
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
