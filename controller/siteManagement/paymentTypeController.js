const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { PaymentType } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'PaymentType';

module.exports = {
    getAll: async (req, res) => {
        try {
            const paymentTypes = await PaymentType.findAll();
            successResponse(res, `${resourceName} fetched successfully`, paymentTypes);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, name, status, orderBy = 'DESC' } = req.query;
            const offset = (page - 1) * limit;

            const filterConfig = {
                name: 'like',
                status: 'exact',
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: paymentTypes, count: totalRecords } = await PaymentType.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]]
            });

            const totalPages = Math.ceil(totalRecords / limit);
            successResponse(res, `${resourceName} fetched successfully`, {
                paymentTypes,
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
            const { name, description, hotelNote, customerNote, adminNote, status } = req.body;
            const createdBy = req.user ? req.user.id : null;

            const newPaymentType = await PaymentType.create({
                name,
                description,
                hotelNote,
                customerNote,
                adminNote,
                status,
                createdBy
            }, {
                userId: createdBy,
                req: req
            });

            successResponse(res, `${resourceName} created successfully`, newPaymentType, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const paymentType = await PaymentType.findByPk(id);
            if (!paymentType) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, paymentType);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, hotelNote, customerNote, adminNote, status } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const paymentType = await PaymentType.findByPk(id);
            if (!paymentType) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            const updatedData = {
                name: name || paymentType.name,
                description: description || paymentType.description,
                hotelNote: hotelNote || paymentType.hotelNote,
                customerNote: customerNote || paymentType.customerNote,
                adminNote: adminNote || paymentType.adminNote,
                status: status !== undefined ? status : paymentType.status,
                updatedBy
            };

            await paymentType.update(updatedData, {
                userId: updatedBy,
                req: req
            });
            successResponse(res, `${resourceName} updated successfully`, paymentType);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;
            
            const paymentType = await PaymentType.destroy({ 
                where: { id },
                userId: deletedBy,
                req: req
            });
            
            if (!paymentType) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    }
};
