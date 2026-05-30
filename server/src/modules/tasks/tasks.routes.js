const router = require('express').Router();
const controller = require('./tasks.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createTaskSchema, updateTaskSchema, updateStatusSchema, listTasksSchema } = require('./tasks.validation');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management with status transitions and Redis caching
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List tasks (paginated, filtered). MEMBER sees only their own.
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *       - in: query
 *         name: assignee
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task list with pagination metadata
 */
router.get('/', authenticate, validate(listTasksSchema, 'query'), controller.list);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a task (ADMIN or MANAGER)
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, project_id]
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               priority:    { type: string, enum: [LOW, MEDIUM, HIGH] }
 *               assignee_id: { type: string, format: uuid }
 *               project_id:  { type: string, format: uuid }
 *               due_date:    { type: string, format: date }
 */
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), validate(createTaskSchema), controller.create);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 */
router.get('/:id', authenticate, controller.getOne);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Update task fields. MEMBER can only update their own assigned tasks.
 *     tags: [Tasks]
 */
router.patch('/:id', authenticate, validate(updateTaskSchema), controller.update);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Advance task status (enforced state machine)
 *     tags: [Tasks]
 *     description: |
 *       Valid transitions:
 *       - TODO → IN_PROGRESS, BLOCKED
 *       - IN_PROGRESS → IN_REVIEW, BLOCKED
 *       - IN_REVIEW → DONE, IN_PROGRESS, BLOCKED
 *       - BLOCKED → TODO, IN_PROGRESS
 *       - DONE → (terminal)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED] }
 */
router.patch('/:id/status', authenticate, validate(updateStatusSchema), controller.updateStatus);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task (ADMIN or MANAGER)
 *     tags: [Tasks]
 */
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), controller.remove);

module.exports = router;
