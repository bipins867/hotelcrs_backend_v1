const { successResponse, errorResponse } = require('../../../utils/responseHelper');
const { User, Role } = require('../../../db/models');
const bcrypt = require('bcryptjs');
const { buildWhereClause } = require('../../../helper/filter');
const { Op } = require('sequelize');
const { fetchAssignHotelId } = require('../../common/helper');

let resourceName = 'User';

module.exports = {
    getAll: async (req, res) => {
        try {
            const { userType } = req.query;

            const assignHotelId = fetchAssignHotelId(req?.user);

            const where = buildWhereClause({ userType }, { userType: 'exact' });

            if (assignHotelId) {
                where.assignedHotelId = {
                    [Op.contains]: assignHotelId,
                };
            }
            const users = await User.findAll({
                where,
                include: [
                    {
                        model: Role,
                        as: 'roleDetails',
                        attributes: ['id', 'name', 'roleType'],
                    },
                ],
                order: [['createdAt', 'DESC']],
            });
            successResponse(res, `${resourceName} fetched successfully`, users);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                orderBy = 'DESC',
                name,
                email,
                userType,
                roleId,
                status,
            } = req.query;

            const offset = (page - 1) * limit;

            const filterConfig = {
                name: 'like',
                email: 'like',
                userType: 'exact',
                roleId: 'exact',
                status: 'exact',
            };

            const wherePayload = {
                name,
                email,
                userType,
                roleId,
                status,
            }

            const assignHotelId = fetchAssignHotelId(req?.user);

            const where = buildWhereClause(wherePayload, filterConfig);

            if (assignHotelId) {
                where.assignedHotelId = {
                    [Op.contains]: assignHotelId,
                };
            }
            const { rows: users, count: totalRecords } = await User.findAndCountAll({
                where,
                include: [
                    {
                        model: Role,
                        as: 'roleDetails',
                        attributes: ['id', 'name', 'roleType'],
                    },
                ],
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]],
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                users,
                totalRecords,
                totalPages,
                currentPage: page,
            });
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    create: async (req, res) => {
        try {
            const { name, email, password, phone, userType, roleId, status, assignedHotelId } = req.body;
            const createdBy = req.user ? req.user.id : null;

            // Hash the password before saving
            const hashedPassword = await bcrypt.hash(password, 10);

            const existingUser = await User.findOne({ where: { email, deletedAt: null } });

            if (existingUser) {
                return errorResponse(res, `Email already exists.`, null, 409);
            }

            const newUser = await User.create({
                name,
                email,
                password: hashedPassword,
                phone,
                userType,
                roleId,
                status,
                assignedHotelId: assignedHotelId,
                createdBy
            }, {
                userId: createdBy,
                req: req
            });

            successResponse(res, `${resourceName} created successfully`, newUser, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id);
            if (!user) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, user);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, email, password, phone, roleId, status, assignedHotelId } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const user = await User.findByPk(id);
            if (!user) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            const existingUser = await User.findOne({ where: { email, id: { [Op.ne]: id }, deletedAt: null } });

            if (existingUser) {
                return errorResponse(res, `Email already exists.`, null, 409);
            }

            const updatedData = {
                name: name,
                email: email,
                phone: phone,
                userType: user.userType,
                roleId: roleId,
                status: status,
                assignedHotelId: assignedHotelId,
                updatedBy,
            };

            // Hash password only if it's being updated
            if (password) {
                updatedData.password = await bcrypt.hash(password, 10);
            } else {
                updatedData.password = user.password;
            }

            await user.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, user);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;

            const userExist = await User.findByPk(id);
            if (!userExist) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            await User.destroy({
                where: { id },
                userId: deletedBy,
                req: req
            });

            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    },
};
