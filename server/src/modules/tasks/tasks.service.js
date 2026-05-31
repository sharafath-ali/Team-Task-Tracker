const db = require('../../config/db');
const { AppError } = require('../../middleware/error.middleware');
const { isValidTransition } = require('../../utils/taskTransitions');
const cache = require('../../utils/cache.utils');

const TASK_JOINS = (query) =>
  query
    .leftJoin('users as assignee', 'tasks.assignee_id', 'assignee.id')
    .join('users as creator', 'tasks.created_by', 'creator.id')
    .join('projects', 'tasks.project_id', 'projects.id')
    .select(
      'tasks.*',
      'assignee.name as assignee_name',
      'assignee.email as assignee_email',
      'creator.name as creator_name',
      'projects.name as project_name'
    );

// ─── List Tasks (with Redis caching) ─────────────────────────────
const listTasks = async ({ orgId, userId, userRole, page = 1, limit = 20, status, priority, assignee, project_id }) => {
  // MEMBER can only see tasks assigned to them — force override
  const effectiveAssignee = userRole === 'MEMBER' ? userId : assignee;

  const cacheKey = cache.buildTaskCacheKey({
    projectId:  project_id || 'all',
    assigneeId: effectiveAssignee || 'all',
    page, limit,
    status:   status   || 'all',
    priority: priority || 'all',
  });

  // Cache-aside: check Redis first
  const cached = await cache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const baseQuery = db('tasks').where('tasks.org_id', orgId);
  if (effectiveAssignee) baseQuery.where('tasks.assignee_id', effectiveAssignee);
  if (status)     baseQuery.where('tasks.status', status);
  if (priority)   baseQuery.where('tasks.priority', priority);
  if (project_id) baseQuery.where('tasks.project_id', project_id);

  const countQuery = baseQuery.clone().count('tasks.id as count');
  const [{ count }] = await countQuery;

  const tasks = await TASK_JOINS(baseQuery.clone())
    .orderBy('tasks.created_at', 'desc')
    .offset((page - 1) * limit)
    .limit(limit);

  const result = { tasks, pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(parseInt(count) / limit) } };

  // Store in Redis
  await cache.set(cacheKey, result);
  return result;
};

// ─── Get One ─────────────────────────────────────────────────────
const getTaskById = async ({ taskId, orgId, userId, userRole }) => {
  const task = await TASK_JOINS(db('tasks').where({ 'tasks.id': taskId, 'tasks.org_id': orgId })).first();
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  if (userRole === 'MEMBER' && task.assignee_id !== userId) {
    throw new AppError('You can only view tasks assigned to you', 403, 'FORBIDDEN');
  }
  return task;
};

// ─── Create ──────────────────────────────────────────────────────
const createTask = async ({ orgId, createdBy, title, description, priority, assignee_id, project_id, due_date }) => {
  // Verify project belongs to org
  const project = await db('projects').where({ id: project_id, org_id: orgId }).first();
  if (!project) throw new AppError('Project not found in your organization', 404, 'NOT_FOUND');

  // Verify assignee belongs to org
  if (assignee_id) {
    const assignee = await db('users').where({ id: assignee_id, org_id: orgId, is_active: true }).first();
    if (!assignee) throw new AppError('Assignee not found in your organization', 404, 'NOT_FOUND');
  }

  const [task] = await db('tasks')
    .insert({ org_id: orgId, project_id, created_by: createdBy, title, description, priority, assignee_id, due_date })
    .returning('*');

  // Invalidate all cached lists for this project (covers 'all-assignee' views too)
  await cache.invalidateProjectCache(project_id);

  return task;
};

// ─── Update Task Fields ───────────────────────────────────────────
const updateTask = async ({ taskId, orgId, userId, userRole, updates }) => {
  const task = await db('tasks').where({ id: taskId, org_id: orgId }).first();
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

  // MEMBER can only update their own assigned tasks
  if (userRole === 'MEMBER' && task.assignee_id !== userId) {
    throw new AppError('You can only update tasks assigned to you', 403, 'FORBIDDEN');
  }

  // If reassigning, verify new assignee is in org
  if (updates.assignee_id && updates.assignee_id !== task.assignee_id) {
    const assignee = await db('users').where({ id: updates.assignee_id, org_id: orgId, is_active: true }).first();
    if (!assignee) throw new AppError('New assignee not found in your organization', 404, 'NOT_FOUND');
  }

  const [updated] = await db('tasks').where({ id: taskId }).update(updates).returning('*');

  // Primary: wipe all project cache (covers ADMIN/MANAGER 'all' views)
  await cache.invalidateProjectCache(task.project_id);
  // Secondary: on reassign, also clear old/new assignee's cross-project keys
  if (updates.assignee_id && updates.assignee_id !== task.assignee_id) {
    await cache.invalidateAssigneeCache(task.assignee_id);
    await cache.invalidateAssigneeCache(updates.assignee_id);
  }

  return updated;
};

// ─── Status Transition ────────────────────────────────────────────
const updateTaskStatus = async ({ taskId, orgId, userId, userRole, newStatus }) => {
  const task = await db('tasks').where({ id: taskId, org_id: orgId }).first();
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

  // Only assignee OR MANAGER/ADMIN can advance status
  const isAssignee  = task.assignee_id === userId;
  const isElevated  = ['ADMIN', 'MANAGER'].includes(userRole);
  if (!isAssignee && !isElevated) {
    throw new AppError('Only the assignee or a MANAGER can change task status', 403, 'FORBIDDEN');
  }

  // Enforce state machine
  if (!isValidTransition(task.status, newStatus)) {
    throw new AppError(
      `Invalid transition: ${task.status} → ${newStatus}. Allowed: ${require('../../utils/taskTransitions').getAllowedTransitions(task.status).join(', ') || 'none (DONE is terminal)'}`,
      422,
      'INVALID_TRANSITION'
    );
  }

  const completedAt = newStatus === 'DONE' ? new Date() : null;
  const [updated] = await db('tasks')
    .where({ id: taskId })
    .update({ status: newStatus, completed_at: completedAt })
    .returning('*');

  // Wipe all project cache so the board refreshes immediately for everyone
  await cache.invalidateProjectCache(task.project_id);
  return updated;
};

// ─── Delete ───────────────────────────────────────────────────────
const deleteTask = async ({ taskId, orgId }) => {
  const task = await db('tasks').where({ id: taskId, org_id: orgId }).first();
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  await db('tasks').where({ id: taskId }).del();
  await cache.invalidateProjectCache(task.project_id);
};

module.exports = { listTasks, getTaskById, createTask, updateTask, updateTaskStatus, deleteTask };
