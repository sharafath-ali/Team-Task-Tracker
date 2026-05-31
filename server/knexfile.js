require("dotenv").config();

/**
 * Knex configuration
 * Supports both DATABASE_URL (Supabase/cloud) and individual env vars (Docker)
 * Switching between them is purely a .env change — no code modification needed.
 */

const baseConnection = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    }
  : {
      host: process.env.POSTGRES_HOST || "postgres",
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER || "taskadmin",
      password: process.env.POSTGRES_PASSWORD || "taskpassword",
      database: process.env.POSTGRES_DB || "tasktracker",
    };

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: "pg",
  connection: baseConnection,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  migrations: {
    directory: "./migrations",
    tableName: "knex_migrations",
    extension: "js",
  },
  seeds: {
    directory: "./seeds",
    extension: "js",
  },
};
