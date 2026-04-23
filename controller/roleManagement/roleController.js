const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { Role } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');
const { Op } = require('sequelize');
const { PERMISSIONS, getAllPermissions } = require('../../constants/permission');

let resourceName = 'Role';

module.exports = {
    getAll: async (req, res) => {
        try {
            const filterConfig = {
                name: 'like',
                roleType: 'exact',
            };
            const where = buildWhereClause(req.query, filterConfig);
            const roles = await Role.findAll({
                where,
                order: [['createdAt', 'DESC']]
            });
            successResponse(res, `${resourceName}s fetched successfully`, roles);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}s`, error.message);
        }
    },

    getAllPermissions: async (req, res) => {
        try {
            // Return permissions in structured format with sections
            const permissionsData = Object.keys(PERMISSIONS).map(key => ({
                key,
                title: PERMISSIONS[key].title,
                permissions: PERMISSIONS[key].permissions
            }));

            // Also include flat array of all permissions for convenience
            const allPermissionsFlat = getAllPermissions();

            successResponse(res, 'Permissions fetched successfully', {
                sections: permissionsData,
                allPermissions: allPermissionsFlat
            });
        } catch (error) {
            errorResponse(res, 'Error fetching permissions', error.message);
        }
    },

    create: async (req, res) => {
        try {
            const { name, roleType, permissions, description } = req.body;
            const createdBy = req.user ? req.user.id : null;

            // Validate permissions is an array
            if (!Array.isArray(permissions)) {
                return errorResponse(res, 'Permissions must be an array', null, 400);
            }

            // Check if role with same name already exists
            const existingRole = await Role.findOne({
                where: { name, deletedAt: null }
            });

            if (existingRole) {
                return errorResponse(res, `Role with name "${name}" already exists`, null, 409);
            }

            const newRole = await Role.create({
                name,
                roleType,
                permissions,
                description,
                createdBy
            }, {
                userId: createdBy,
                req: req
            });

            successResponse(res, `${resourceName} created successfully`, newRole, 201);
        } catch (error) {
            console.error('Error creating role:', error);
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const role = await Role.findByPk(id);
            if (!role) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, role);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, roleType, permissions, description } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const role = await Role.findByPk(id);
            if (!role) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            // Check if another role with same name exists
            if (name && name !== role.name) {
                const existingRole = await Role.findOne({
                    where: {
                        name,
                        id: { [Op.ne]: id },
                        deletedAt: null
                    }
                });

                if (existingRole) {
                    return errorResponse(res, `Role with name "${name}" already exists`, null, 409);
                }
            }

            // Validate permissions is an array if provided
            if (permissions !== undefined && !Array.isArray(permissions)) {
                return errorResponse(res, 'Permissions must be an array', null, 400);
            }

            const updatedData = {
                name: name || role.name,
                roleType: roleType || role.roleType,
                permissions: permissions !== undefined ? permissions : role.permissions,
                description: description !== undefined ? description : role.description,
                updatedBy,
            };

            await role.update(updatedData, {
                userId: updatedBy,
                req: req
            });

            successResponse(res, `${resourceName} updated successfully`, role);
        } catch (error) {
            console.error('Error updating role:', error);
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;

            const roleExist = await Role.findByPk(id);
            if (!roleExist) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            await Role.destroy({
                where: { id },
                userId: deletedBy,
                req: req
            });

            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            console.error('Error deleting role:', error);
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    },
};

