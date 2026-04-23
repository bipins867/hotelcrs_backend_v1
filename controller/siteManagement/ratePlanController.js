const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { RatePlan } = require('../../db/models');
const { Op } = require('sequelize');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Plan rate';

module.exports = {

    getAll: async (req, res) => {
        try {
            const filterConfig = {
                name: 'like',
                status: 'exact',
            };
        
            const where = buildWhereClause(req.query, filterConfig);

            const ratePlans = await RatePlan.findAll({
                where
            });
            successResponse(res, `${resourceName} fetched successfully`, ratePlans);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}` , error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {       
            const { 
                page = 1, 
                limit = 10, 
                name, 
                status, 
                orderBy = 'DESC'
            } = req.query; 

            const offset = (page - 1) * limit;

            const filterConfig = {
                name: 'like',
                status: 'exact',
            };
        
            const where = buildWhereClause(req.query, filterConfig);

            const { rows: ratePlans, count: totalRecords } = await RatePlan.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]]
            });        

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                ratePlans,
                totalRecords,
                totalPages,
                currentPage: page
            });
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}` , error.message);
        }
    },
    
    create: async (req, res) => {
        try {
            const { name, description, status } = req.body;
            const createdBy = req.user ? req.user.id : null;
            const newRatePlan = await RatePlan.create({ name, description, status, createdBy }, {
                userId: createdBy,
                req: req
            });
            successResponse(res, `${resourceName} created successfully`, newRatePlan, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const ratePlan = await RatePlan.findByPk(id);
            if (!ratePlan) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, ratePlan);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, status } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const ratePlan = await RatePlan.findByPk(id);
            if (!ratePlan) {
                return errorResponse(res, 'Rate Plan not found', null, 404);
            }

            const updatedData = {
                name: name || ratePlan.name,
                description: description || ratePlan.description,
                status: status !== undefined ? status : ratePlan.status,
                updatedBy,
            };

            await ratePlan.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, ratePlan);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const ratePlan = await RatePlan.destroy({ 
                where: { id: req.params.id },
                userId: deletedBy,
                req: req
            });
            
            if (!ratePlan) {
                return errorResponse(res, 'Rate Plan not found', null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};
