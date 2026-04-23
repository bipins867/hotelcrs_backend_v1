const { successResponse, errorResponse } = require('../utils/responseHelper');
const { Inclusion } = require('../db/models');
const { buildWhereClause } = require('../helper/filter');

let resourceName = 'Inclusion';

module.exports = {
    getAll: async (req, res) => {
        try {
            const inclusions = await Inclusion.findAll();
            successResponse(res, `${resourceName} fetched successfully`, inclusions);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                name,
                status,
                orderBy = 'DESC',
            } = req.query;

            const offset = (page - 1) * limit;

            const filterConfig = {
                name: 'like',
                status: 'exact',
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: inclusions, count: totalRecords } = await Inclusion.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]],
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                inclusions,
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
            const { name, status } = req.body;
            const createdBy = req.user ? req.user.id : null;
            const newInclusion = await Inclusion.create({ name, status, createdBy }, {
                userId: createdBy,
                req: req
            });
            successResponse(res, `${resourceName} created successfully`, newInclusion, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const inclusion = await Inclusion.findByPk(id);
            if (!inclusion) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, inclusion);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, status } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const inclusion = await Inclusion.findByPk(id);
            if (!inclusion) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            const updatedData = {
                name: name || inclusion.name,
                status: status !== undefined ? status : inclusion.status,
                updatedBy,
            };

            await inclusion.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, inclusion);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const inclusion = await Inclusion.destroy({ 
                where: { id },
                userId: deletedBy,
                req: req
            });
            
            if (!inclusion) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    },
};
