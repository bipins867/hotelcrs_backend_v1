const { errorResponse } = require('../../utils/responseHelper');

module.exports = {
    validatePolicyCreate: async (req, res, next) => {
        const { hotelId, generalPolicies } = req.body;

        const errors = {};

        if (!hotelId) {
            errors.hotelId = 'Hotel Id are required';
        }

        if (!generalPolicies) {
            errors.generalPolicies = 'General policies are required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validatePolicyUpdate: async (req, res, next) => {
        const { hotelId, generalPolicies } = req.body;

        const errors = {};

        if (!hotelId) {
            errors.hotelId = 'Hotel Id are required';
        }

        if (generalPolicies && typeof generalPolicies !== 'string') {
            errors.generalPolicies = 'General policies must be a string';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },
};
