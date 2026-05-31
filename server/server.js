require("dotenv").config();
const app = require("./src/app");
const logger = require("./src/utils/logger");
const db = require("./src/config/db");
const env = require("./src/config/env");

const PORT = env.PORT || 5000;

async function start() {
  try {
    // Run all pending Knex migrations automatically on startup
    logger.info("🔄  Running database migrations...");
    const [batch, migrations] = await db.migrate.latest();
    if (migrations.length === 0) {
      logger.info("✅  Database is already up to date");
    } else {
      logger.info(
        `✅  Ran ${migrations.length} migration(s) in batch ${batch}:`,
      );
      migrations.forEach((m) => logger.info(`     • ${m}`));
    }

    app.listen(PORT, () => {
      logger.info(`🚀  Server running on http://localhost:${PORT}`);
      logger.info(`📚  API Docs  → http://localhost:${PORT}/api/docs`);
      logger.info(
        `💾  pgAdmin  → http://localhost:5050  (admin@tasktracker.com / admin)`,
      );
      logger.info(`🔴  RedisInsight → http://localhost:8001`);
    });
  } catch (err) {
    logger.error("❌  Failed to start server:", err);
    process.exit(1);
  }
}

start();
