const { errorResponse } = require('../../utils/responseHelper');
const { Customer, State, Country, City } = require('../../db/models');
const { Op } = require('sequelize');

module.exports = {
    validateCustomerCreate: async (req, res, next) => {
        const { email } = req.body;
        if (email && Array.isArray(email) && email.length > 0) {
            try {
                // Check if any email in the array already exists
                const existingCustomer = await Customer.findOne({
                    where: {
                        [Op.or]: email.map(emailItem => ({
                            email: {
                                [Op.contains]: [emailItem]
                            }
                        }))
                    }
                });
                if (existingCustomer) {
                    return errorResponse(res, 'Email must be unique', 400);
                }
            } catch (error) {
                console.error('Database query error:', error);
                return errorResponse(res, 'Database error during validation', 500);
            }
        }

        next();
    },

    validateCustomerUpdate: async (req, res, next) => {
        const { email } = req.body;
        const { id } = req.params;

        if (email && Array.isArray(email) && email.length > 0) {
            try {
                // Check if any email in the array already exists (excluding current customer)
                const existingCustomer = await Customer.findOne({
                    where: {
                        [Op.and]: [
                            {
                                [Op.or]: email.map(emailItem => ({
                                    email: {
                                        [Op.contains]: [emailItem]
                                    }
                                }))
                            },
                            {
                                id: { [Op.ne]: id }
                            }
                        ]
                    }
                });
                if (existingCustomer) {
                    return errorResponse(res, 'Email must be unique', 400);
                }
            } catch (error) {
                console.error('Database query error:', error);
                return errorResponse(res, 'Database error during validation', 500);
            }
        }
        next();
    }
};
