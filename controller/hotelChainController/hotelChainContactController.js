const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { HotelChainContact, HotelChain } = require('../../db/models');
const { Op } = require('sequelize');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Hotel Chain Contact';

module.exports = {
    getAll: async (req, res) => {
        try {
            const data = await HotelChainContact.findAll({
                include: [
                    { model: HotelChain, as: 'hotelChain' },
                ]
            });
            successResponse(res, `${resourceName} fetched successfully`, data);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    create: async (req, res) => {
        try {
            const { hotelChainId, type, name, mobile, email, createdBy = req?.user?.id } = req.body;

            const data = await HotelChainContact.create({ hotelChainId, type, name, mobile, email, createdBy }, {
                userId: createdBy,
                req: req
            });
            successResponse(res, `${resourceName} created successfully`, data, 201);
        } catch (error) {
            console.error('Error in create controller:', error.message);
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await HotelChainContact.findByPk(id);
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
            const { hotelChainId, type, name, mobile, email, updatedBy = req?.user?.id } = req.body;

            const data = await HotelChainContact.findByPk(id);
            if (!data) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            const updatedData = {hotelChainId, type, name, mobile, email, updatedBy};
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
            
            const data = await HotelChainContact.destroy({ 
                where: { id },
                userId: deletedBy,
                req: req
            });
            
            if (!data) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};
