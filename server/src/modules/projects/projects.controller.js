const projectsService = require('./projects.service');
const { sendSuccess } = require('../../utils/response.utils');

const list = async (req, res, next) => {
  try {
    const result = await projectsService.listProjects({ orgId: req.user.org_id, ...req.query });
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectById({ projectId: req.params.id, orgId: req.user.org_id });
    sendSuccess(res, { project });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const project = await projectsService.createProject({ orgId: req.user.org_id, createdBy: req.user.id, ...req.body });
    sendSuccess(res, { project }, 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const project = await projectsService.updateProject({ projectId: req.params.id, orgId: req.user.org_id, updates: req.body });
    sendSuccess(res, { project });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await projectsService.deleteProject({ projectId: req.params.id, orgId: req.user.org_id });
    sendSuccess(res, { message: 'Project deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove };
