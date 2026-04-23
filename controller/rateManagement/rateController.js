const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { Rate, RoomType, RatePlan } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Rate';

module.exports = {
    getAll: async (req, res) => {
        try {
            const rates = await Rate.findAll({
                include: [
                    { model: RoomType, as: 'roomType' },
                    { model: RatePlan, as: 'ratePlan' }
                ]
            });
            successResponse(res, `${resourceName} fetched successfully`, rates);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, orderBy = 'DESC' } = req.query;
            const offset = (page - 1) * limit;

            const filterConfig = {
                roomTypeId: 'exact',
                ratePlanId: 'exact',
                startDate: 'exact',
                endDate: 'exact',
                currency: 'exact',
                rate: 'exact',
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: rates, count: totalRecords } = await Rate.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                include: [
                    { model: RoomType, as: 'roomType' },
                    { model: RatePlan, as: 'ratePlan' }
                ],
                order: [['createdAt', orderBy]]
            });

            const totalPages = Math.ceil(totalRecords / limit);
            successResponse(res, `${resourceName} fetched successfully`, {
                rates,
                totalRecords,
                totalPages,
                currentPage: page
            });
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    create: async (req, res) => {
        try {
            const { currency, roomTypeId, ratePlanId, startDate, endDate, rate } = req.body;
            const createdBy = req.user ? req.user.id : null;


            const newRate = await Rate.create({
                createdBy,
                roomTypeId,
                ratePlanId,
                startDate,
                endDate,
                currency,
                rate
            }, {
                userId: createdBy,
                req: req
            });

            successResponse(res, `${resourceName} created successfully`, newRate, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const rate = await Rate.findByPk(id, {
                include: [
                    { model: RoomType, as: 'roomType' },
                    { model: RatePlan, as: 'ratePlan' }
                ]
            });

            if (!rate) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, rate);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { currency, roomTypeId, ratePlanId, startDate, endDate, rate } = req.body;

            const updatedBy = req.user ? req.user.id : null;

            const rateRecord = await Rate.findByPk(id);
            if (!rateRecord) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            const updatedData = {
                updatedBy: updatedBy || rateRecord.updatedBy,
                roomTypeId: roomTypeId || rateRecord.roomTypeId,
                ratePlanId: ratePlanId || rateRecord.ratePlanId,
                startDate: startDate || rateRecord.startDate,
                endDate: endDate || rateRecord.endDate,
                currency: currency || rateRecord.currency,
                rate: rate || rateRecord.rate
            };

            await rateRecord.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, rateRecord);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const rate = await Rate.destroy({ 
                where: { id },
                userId: deletedBy,
                req: req
            });
            
            if (!rate) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};


