const router = require("express").Router();
const controller = require("./users.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/rbac.middleware");
const { validate } = require("../../middleware/validate.middleware");
const {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
} = require("./users.validation");

// GET /users is accessible to ADMIN and MANAGER (needed for member dropdowns)
// All mutating routes remain ADMIN-only (enforced per-route below)
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management — ADMIN only
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users in the organization
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, MANAGER, MEMBER] }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Forbidden — ADMIN only
 */
router.get("/", validate(listUsersSchema, "query"), controller.list);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create/invite a user into the organization
 *     tags: [Users]
 */
router.post(
  "/",
  authorize("ADMIN"),
  validate(createUserSchema),
  controller.create,
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.get("/:id", controller.getOne);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user role or active status
 *     tags: [Users]
 */
router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(updateUserSchema),
  controller.update,
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Deactivate a user (soft delete)
 *     tags: [Users]
 */
router.delete("/:id", authorize("ADMIN"), controller.deactivate);

module.exports = router;
