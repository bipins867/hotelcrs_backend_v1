const { errorResponse, successResponse } = require("../../utils/responseHelper");
const { RoomView } = require("../../db/models");
let resourceName = 'Room View';

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const createdBy = req.user ? req.user.id : null;

    const data = await RoomView.create({ name, createdBy }, {
      userId: createdBy,
      req: req
    });
    successResponse(res, `${resourceName} created successfully`, data, 201);

  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await RoomView.findAll();
    successResponse(res, `${resourceName} fetched successfully`, data);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await RoomView.findByPk(id);
    if (!data) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }
    successResponse(res, `${resourceName} fetched successfully`, data);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedBy = req.user ? req.user.id : null;
    const data = await RoomView.findByPk(id);
    if (!data) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }
    data.name = name || data.name;
    data.updatedBy = updatedBy;
    await data.save({
      userId: updatedBy,
      req: req
    });
    successResponse(res, `${resourceName} updated successfully`, data);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.deleteRoomView = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user ? req.user.id : null;
    const data = await RoomView.findByPk(id);
    if (!data) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }
    await data.destroy({
      userId: deletedBy,
      req: req
    });
    successResponse(res, `${resourceName} deleted successfully`);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};
