const tasksService = require("./tasks.service");
const { sendSuccess } = require("../../utils/response.utils");

const list = async (req, res, next) => {
  try {
    const result = await tasksService.listTasks({
      orgId: req.user.org_id,
      userId: req.user.id,
      userRole: req.user.role,
      ...req.query,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const task = await tasksService.getTaskById({
      taskId: req.params.id,
      orgId: req.user.org_id,
      userId: req.user.id,
      userRole: req.user.role,
    });
    sendSuccess(res, { task });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const task = await tasksService.createTask({
      orgId: req.user.org_id,
      createdBy: req.user.id,
      ...req.body,
    });
    sendSuccess(res, { task }, 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const task = await tasksService.updateTask({
      taskId: req.params.id,
      orgId: req.user.org_id,
      userId: req.user.id,
      userRole: req.user.role,
      updates: req.body,
    });
    sendSuccess(res, { task });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const task = await tasksService.updateTaskStatus({
      taskId: req.params.id,
      orgId: req.user.org_id,
      userId: req.user.id,
      userRole: req.user.role,
      newStatus: req.body.status,
    });
    sendSuccess(res, { task });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await tasksService.deleteTask({
      taskId: req.params.id,
      orgId: req.user.org_id,
    });
    sendSuccess(res, { message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, updateStatus, remove };
