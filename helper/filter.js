const { Op } = require('sequelize');
const { sequelize } = require("../db/models");


/**
 * @param {Object} queryParams
 * @param {Object} filterConfig
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object}
 */
const buildWhereClause = (queryParams, filterConfig) => {
    const where = {};

    Object.entries(filterConfig).forEach(([key, operator]) => {
        const value = queryParams[key];
        if (value !== undefined) {
            if (operator === 'like') {
                where[key] = { [Op.iLike]: `%${value}%` }; // For partial match
            } else if (operator === 'exact') {
                where[key] = value; // Exact match
            } else if (operator === 'boolean') {
                where[key] = Boolean(value); // Exact match
            } else if (operator === 'gte') {
                where[key] = { [Op.gte]: value }; // Greater than or equal to
            } else if (operator === 'lte') {
                where[key] = { [Op.lte]: value }; // Less than or equal to
            } else if (operator === 'range') {
                if (typeof value === "object" && (value[Op.between] || value[Op.gte] || value[Op.lte])) {
                    where[key] = value;
                } else {
                    const [min, max] = value.split(','); // Assuming 'min,max' format for range
                    where[key] = {
                        ...(min && { [Op.gte]: min }),
                        ...(max && { [Op.lte]: max })
                    };
                }
            } else if (operator === 'array') {
                where[key] = {
                    [Op.contains]: [value],
                };
            } else if (operator === 'json') {
                where[key] = sequelize.literal(`${key}::TEXT ILIKE '%${value}%'`);
            } else if (operator === 'in') {
                where[key] = {
                    [Op.in]: value
                }
            }
        }
    });
    return where;
};

module.exports = {
    buildWhereClause
};
