const knex = require("knex");
const knexConfig = require("../../knexfile");
const logger = require("../utils/logger");

const db = knex(knexConfig);

// Test connection on startup
db.raw("SELECT 1")
  .then(() => logger.info("📦  PostgreSQL connected via Knex"))
  .catch((err) => {
    logger.error("❌  PostgreSQL connection failed:", err.message);
    process.exit(1);
  });

module.exports = db;
