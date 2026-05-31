const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Team Task Tracker API",
      version: "1.0.0",
      description:
        "REST API for team-based task management with JWT auth, RBAC, and Redis caching.\n\n" +
        "**To use protected endpoints:** Register → Login → copy `accessToken` → click Authorize 🔒",
      contact: { name: "API Support" },
    },
    servers: [{ url: "http://localhost:5000", description: "Local Docker" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            status: { type: "integer", example: 400 },
            code: { type: "string", example: "VALIDATION_ERROR" },
            message: {
              type: "string",
              example: "due_date must be a future date",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string" },
            name: { type: "string" },
            role: { type: "string", enum: ["ADMIN", "MANAGER", "MEMBER"] },
            org_id: { type: "string", format: "uuid" },
            is_active: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            status: {
              type: "string",
              enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"],
            },
            assignee_id: { type: "string", format: "uuid", nullable: true },
            due_date: { type: "string", format: "date", nullable: true },
            project_id: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/modules/**/*.routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Task Tracker API",
      customCss: `
        .swagger-ui .topbar { background: linear-gradient(135deg, #1e293b, #334155); }
        .swagger-ui .topbar-wrapper .link { display: none; }
      `,
    }),
  );
  // Raw JSON spec (useful for Postman import)
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
};

module.exports = { setupSwagger };
