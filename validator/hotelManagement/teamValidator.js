const { errorResponse } = require('../../utils/responseHelper');

module.exports = {
    validateTeamCreate: async (req, res, next) => {
        const { hotelId, teamMembers } = req.body;

        const errors = {};

        if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
            errors.hotelId = 'Invalid team members data';
        }

        if (!hotelId) {
            errors.hotelId = 'Hotel Id is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validateTeamUpdate: async (req, res, next) => {
        const { hotelId, teamMembers } = req.body;

        const errors = {};

        if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
            errors.hotelId = 'Invalid team members data';
        }

        if (!hotelId) {
            errors.hotelId = 'Hotel Id is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },
};
