const db = require('../../config/db');
const { AppError } = require('../../middleware/error.middleware');

// ─── List Projects ───────────────────────────────────────────────
const listProjects = async ({ orgId, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const [{ count }] = await db('projects').where({ org_id: orgId }).count('id as count');
  const projects = await db('projects')
    .join('users', 'projects.created_by', 'users.id')
    .where('projects.org_id', orgId)
    .select('projects.*', 'users.name as created_by_name')
    .orderBy('projects.created_at', 'desc')
    .offset(offset).limit(limit);

  return { projects, pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) } };
};

// ─── Get One ─────────────────────────────────────────────────────
const getProjectById = async ({ projectId, orgId }) => {
  const project = await db('projects')
    .join('users', 'projects.created_by', 'users.id')
    .where({ 'projects.id': projectId, 'projects.org_id': orgId })
    .select('projects.*', 'users.name as created_by_name')
    .first();
  if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
  return project;
};

// ─── Create ──────────────────────────────────────────────────────
const createProject = async ({ orgId, createdBy, name, description }) => {
  const [project] = await db('projects')
    .insert({ org_id: orgId, created_by: createdBy, name, description })
    .returning('*');
  return project;
};

// ─── Update ──────────────────────────────────────────────────────
const updateProject = async ({ projectId, orgId, updates }) => {
  const project = await db('projects').where({ id: projectId, org_id: orgId }).first();
  if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
  const [updated] = await db('projects').where({ id: projectId }).update(updates).returning('*');
  return updated;
};

// ─── Delete ──────────────────────────────────────────────────────
const deleteProject = async ({ projectId, orgId }) => {
  const project = await db('projects').where({ id: projectId, org_id: orgId }).first();
  if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
  await db('projects').where({ id: projectId }).del();
};

module.exports = { listProjects, getProjectById, createProject, updateProject, deleteProject };
