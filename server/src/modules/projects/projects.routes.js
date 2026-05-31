const router = require("express").Router();
const controller = require("./projects.controller");
const membersController = require("./project-members.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/rbac.middleware");
const { validate } = require("../../middleware/validate.middleware");
const {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
} = require("./projects.validation");

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

// ─── Project CRUD ────────────────────────────────────────────────

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List accessible projects. ADMIN sees all; MANAGER/MEMBER see only assigned projects.
 *     tags: [Projects]
 */
router.get(
  "/",
  authenticate,
  validate(listProjectsSchema, "query"),
  controller.list,
);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a project (ADMIN or MANAGER). Creator is auto-added as OWNER.
 *     tags: [Projects]
 */
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  validate(createProjectSchema),
  controller.create,
);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID (with stats). Non-admins must be a member.
 *     tags: [Projects]
 */
router.get("/:id", authenticate, controller.getOne);

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update project (ADMIN or MANAGER)
 *     tags: [Projects]
 */
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  validate(updateProjectSchema),
  controller.update,
);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project (ADMIN only)
 *     tags: [Projects]
 */
router.delete("/:id", authenticate, authorize("ADMIN"), controller.remove);

// ─── Project Members ─────────────────────────────────────────────

/**
 * @swagger
 * /api/projects/{id}/members:
 *   get:
 *     summary: List members of a project
 *     tags: [Projects]
 */
router.get("/:id/members", authenticate, membersController.list);

/**
 * @swagger
 * /api/projects/{id}/members:
 *   post:
 *     summary: Add a user to a project (ADMIN only)
 *     tags: [Projects]
 */
router.post(
  "/:id/members",
  authenticate,
  authorize("ADMIN"),
  membersController.add,
);

/**
 * @swagger
 * /api/projects/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a user from a project (ADMIN only)
 *     tags: [Projects]
 */
router.delete(
  "/:id/members/:userId",
  authenticate,
  authorize("ADMIN"),
  membersController.remove,
);

/**
 * @swagger
 * /api/projects/{id}/members/{userId}:
 *   patch:
 *     summary: Update a member's project role (ADMIN only)
 *     tags: [Projects]
 */
router.patch(
  "/:id/members/:userId",
  authenticate,
  authorize("ADMIN"),
  membersController.updateRole,
);

module.exports = router;
