const { errorResponse } = require('../../utils/responseHelper');
const { PaymentType } = require('../../db/models');
const { Op } = require('sequelize');

module.exports = {
    validatePaymentTypeCreate: async (req, res, next) => {
        const { name, status } = req.body;

        const errors = {};

        if (!name) {
            errors.name = 'Payment Type Name is required';
        }

        if (name) {
            const existingPaymentType = await PaymentType.findOne({
                where: { name }
            });

            if (existingPaymentType) {
                errors.name = 'Payment Type Name must be unique';
            }
        }
        
        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validatePaymentTypeUpdate: async (req, res, next) => {
        const { name, status } = req.body;

        const errors = {};

        if (!name) {
            errors.name = 'Payment Type Name is required';
        }

        if (name) {
            const existingPaymentType = await PaymentType.findOne({
                where: { name, id: { [Op.ne]: req.params.id } }
            });

            if (existingPaymentType) {
                errors.name = 'Payment Type Name must be unique';
            }
        }

        if (status !== 0 && status !== 1) {
            errors.status = 'Status must be either 0 or 1';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    }
};
