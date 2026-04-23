// Validator Module
const { errorResponse } = require('../../utils/responseHelper');

module.exports = {
    validateRateCreate: async (req, res, next) => {
        const { roomTypeId, ratePlanId, startDate, endDate, rate } = req.body;

        const errors = {};

        if (!roomTypeId) {
            errors.roomTypeId = 'Room Type ID is required';
        }

        if (!ratePlanId) {
            errors.ratePlanId = 'Rate Plan ID is required';
        }

        if (!startDate) {
            errors.startDate = 'Start Date is required';
        }

        if (!endDate) {
            errors.endDate = 'End Date is required';
        }

        if (!rate) {
            errors.rate = 'Rate is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validateRateUpdate: async (req, res, next) => {
        const { roomTypeId, ratePlanId, startDate, endDate, rate } = req.body;
        const { id } = req.params;

        const errors = {};

        if (!roomTypeId) {
            errors.roomTypeId = 'Room Type ID is required';
        }

        if (!ratePlanId) {
            errors.ratePlanId = 'Rate Plan ID is required';
        }

        if (!startDate) {
            errors.startDate = 'Start Date is required';
        }

        if (!endDate) {
            errors.endDate = 'End Date is required';
        }

        if (!rate) {
            errors.rate = 'Rate is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    }
};