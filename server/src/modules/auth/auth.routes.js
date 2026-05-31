const router = require("express").Router();
const controller = require("./auth.controller");
const { validate } = require("../../middleware/validate.middleware");
const { authenticate } = require("../../middleware/auth.middleware");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
} = require("./auth.validation");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — register, login, token rotation, logout
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new organization and first ADMIN user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orgName, name, email, password]
 *             properties:
 *               orgName:  { type: string, example: "Acme Corp" }
 *               name:     { type: string, example: "Alice Smith" }
 *               email:    { type: string, example: "alice@acme.com" }
 *               password: { type: string, minLength: 8, example: "password123" }
 *     responses:
 *       201:
 *         description: Organization and admin user created successfully
 *       409:
 *         description: Email or organization name already exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/register", validate(registerSchema), controller.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive access + refresh token pair
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: "alice@acme.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Returns accessToken (15m) and refreshToken (7d)
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), controller.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate refresh token — revokes old, issues new pair
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New accessToken and refreshToken
 *       401:
 *         description: Token invalid, expired, or already revoked
 */
router.post("/refresh", validate(refreshSchema), controller.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Revoke refresh token (logout)
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authenticate, controller.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the currently authenticated user's profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current user with org details
 *       401:
 *         description: Not authenticated
 */
router.get("/me", authenticate, controller.me);

module.exports = router;
