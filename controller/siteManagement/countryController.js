const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { Country, State } = require('../../db/models');
const { Op } = require('sequelize');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Country';

module.exports = {

    getAll: async (req, res) => {
        try {
            const filterConfig = {
                name: 'like'
            };
            const where = buildWhereClause(req.query, filterConfig);

            const countries = await Country.findAll({ where });
            successResponse(res, `${resourceName} fetched successfully`, countries);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}` , error.message);
        }
    },

    getWithState: async (req, res) => {
        try {
            const countries = await Country.findAll({
                include: [{
                    model: State,
                    as: 'states'
                }]
            });
            successResponse(res, `Country with associated States fetched successfully`, countries);
        } catch (error) {
            errorResponse(res, `Error fetching Country with States` , error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {       
            const { 
                page = 1, 
                limit = 10, 
                name, 
                orderBy = 'DESC' 
            } = req.query; 

            const offset = (page - 1) * limit;

            const filterConfig = {
                name: 'like'
            };
        
            const where = buildWhereClause(req.query, filterConfig);

            const { rows: countries, count: totalRecords } = await Country.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]]
            });        

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                countries,
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
            const { name, code, image, description } = req.body;
            const createdBy = req.user ? req.user.id : null;
            
            const newCountry = await Country.create({ name, code, image, description, createdBy }, {
                userId: createdBy,
                req: req
            });
            successResponse(res, `${resourceName} created successfully`, newCountry, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const country = await Country.findByPk(id);
            if (!country) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, country);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, code, image, description } = req.body;

            const country = await Country.findByPk(id);
            if (!country) {
                return errorResponse(res, 'Country not found', null, 404);
            }
            const updatedBy = req.user ? req.user.id : null;
            const updatedData = {
                name,
                code,
                image,
                description,
                updatedBy,
            };

            
            await country.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, country);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const country = await Country.destroy({ 
                where: { id },
                userId: deletedBy,
                req: req
            });
            
            if (!country) {
                return errorResponse(res, 'Country not found', null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};
