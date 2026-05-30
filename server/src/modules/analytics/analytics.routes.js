const router = require('express').Router();
const controller = require('./analytics.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics endpoints (ADMIN and MANAGER only)
 */

/**
 * @swagger
 * /api/analytics/overdue:
 *   get:
 *     summary: Get overdue task count per user
 *     tags: [Analytics]
 *     description: Returns users with tasks past due_date that are not DONE or BLOCKED
 *     responses:
 *       200:
 *         description: List of users with their overdue task counts
 */
router.get('/overdue', controller.overdue);

/**
 * @swagger
 * /api/analytics/completion-time:
 *   get:
 *     summary: Get average task completion time per user (in hours)
 *     tags: [Analytics]
 *     description: Calculates avg time from task creation to DONE status
 *     responses:
 *       200:
 *         description: List of users with average completion time in hours
 */
router.get('/completion-time', controller.completionTime);

module.exports = router;
