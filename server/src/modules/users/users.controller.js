const usersService = require("./users.service");
const { sendSuccess } = require("../../utils/response.utils");

const list = async (req, res, next) => {
  try {
    const result = await usersService.listUsers({
      orgId: req.user.org_id,
      ...req.query,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const user = await usersService.getUserById({
      userId: req.params.id,
      orgId: req.user.org_id,
    });
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const user = await usersService.createUser({
      orgId: req.user.org_id,
      ...req.body,
    });
    sendSuccess(res, { user }, 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const user = await usersService.updateUser({
      userId: req.params.id,
      orgId: req.user.org_id,
      updates: req.body,
    });
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

const deactivate = async (req, res, next) => {
  try {
    const user = await usersService.deactivateUser({
      userId: req.params.id,
      orgId: req.user.org_id,
      requesterId: req.user.id,
    });
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, deactivate };
