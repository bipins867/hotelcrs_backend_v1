const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { City, Country, State } = require('../../db/models');
const { Op } = require('sequelize');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'City';

module.exports = {
    getAll: async (req, res) => {
        try {
            const filterConfig = {
                name: 'like',
                countryId: 'exact',
                stateId: 'exact'
            };
            const where = buildWhereClause(req.query, filterConfig);

            const cities = await City.findAll({
                include: [
                    { model: Country, as: 'country' },
                    { model: State, as: 'state' }
                ],
                where
            });
            successResponse(res, `${resourceName} fetched successfully`, cities);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    getCityWithStateCountry: async (req, res) => {
        try {
            const cities = await City.findAll({
                include: [
                    { model: Country, as: 'country' },
                    { model: State, as: 'state' }
                ]
            });
        
            if (!cities || cities.length === 0) {
                return errorResponse(res, 'No cities found', null, 404);
            }
        
            successResponse(res, 'Cities with State and Country fetched successfully', cities);
        } catch (error) {
            errorResponse(res, 'Error fetching cities with State and Country', error.message);
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
                name: 'like',
                countryId: 'exact',
                stateId: 'exact'
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: cities, count: totalRecords } = await City.findAndCountAll({
                where,
                include: [
                    { model: Country, as: 'country' },
                    { model: State, as: 'state' }
                ],
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]]
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                cities,
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
            const { countryId, stateId, multipleCity } = req.body;
            const createdBy = req.user ? req.user.id : null;
            
            const allData = multipleCity?.map((row) => {
                const { code, name, image, description} = row;
                return {countryId, stateId, code, name, image, description, createdBy};
            })

            const newCity = await City.bulkCreate(allData, {
                userId: createdBy,
                req: req
            });
            successResponse(res, `${resourceName} created successfully`, newCity, 201);
        } catch (error) {
            console.error('Error in create controller:', error.message);
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const city = await City.findByPk(id);
            if (!city) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, city);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { countryId, stateId, name, code, image,  description } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const city = await City.findByPk(id);
            if (!city) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            const updatedData = {countryId, stateId, name, code, image,  description, updatedBy};

            await city.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, city);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const city = await City.destroy({ 
                where: { id },
                userId: deletedBy,
                req: req
            });
            
            if (!city) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};
