const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { State, Country } = require('../../db/models');
const { Op } = require('sequelize');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'State';

module.exports = {

    getAll: async (req, res) => {
        try {
            const filterConfig = {
                name: 'like',
                countryId: 'exact'
            };

            const where = buildWhereClause(req.query, filterConfig);

            const states = await State.findAll({
                where,
                order: [['name', 'ASC']]
            });
            successResponse(res, `${resourceName} fetched successfully`, states);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    getStateWithCountry: async (req, res) => {
        try {
            const states = await State.findAll({
                include: [{
                    model: Country,
                    as: 'country'
                }]
            });
            successResponse(res, `${resourceName} with associated Country fetched successfully`, states);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName} with Country`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                name,
                countryId,
                orderBy = 'DESC'
            } = req.query;

            const offset = (page - 1) * limit;

            const filterConfig = {
                name: 'like',
                countryId: 'exact'
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: states, count: totalRecords } = await State.findAndCountAll({
                where,
                include: [{
                    model: Country,
                    as: 'country'
                }],
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]]
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                states,
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
            const { countryId, multipleState } = req.body;
            const createdBy = req.user ? req.user.id : null;
            const allData = multipleState?.map((row) => {
                const { code, name, image, description, gstDetails } = row;
                return { 
                    countryId, 
                    code, 
                    name, 
                    image, 
                    description,
                    gstDetails: gstDetails || [],
                    createdBy,
                };
            });

            const newStates = await State.bulkCreate(allData, {
                userId: createdBy,
                req: req
            });
            successResponse(res, `${resourceName} created successfully`, newStates, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const state = await State.findByPk(id);
            if (!state) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, state);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, image, code, description, countryId, gstDetails } = req.body;

            const state = await State.findByPk(id);
            if (!state) {
                return errorResponse(res, 'State not found', null, 404);
            }
            const updatedBy = req.user ? req.user.id : null;
            const updatedData = { 
                countryId, 
                name, 
                code, 
                image, 
                description,
                gstDetails: gstDetails || [],
                updatedBy,
            };
            
            await state.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, state);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const state = await State.destroy({ 
                where: { id: req.params.id },
                userId: deletedBy,
                req: req
            });
            
            if (!state) {
                return errorResponse(res, 'State not found', null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};
