const router = require('express').Router();
const controller = require('./projects.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createProjectSchema, updateProjectSchema, listProjectsSchema } = require('./projects.validation');

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List all projects in the organization
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Paginated project list
 */
router.get('/', authenticate, validate(listProjectsSchema, 'query'), controller.list);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a project (ADMIN or MANAGER)
 *     tags: [Projects]
 */
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), validate(createProjectSchema), controller.create);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 */
router.get('/:id', authenticate, controller.getOne);

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update project (ADMIN or MANAGER)
 *     tags: [Projects]
 */
router.patch('/:id', authenticate, authorize('ADMIN', 'MANAGER'), validate(updateProjectSchema), controller.update);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project (ADMIN only)
 *     tags: [Projects]
 */
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove);

module.exports = router;
