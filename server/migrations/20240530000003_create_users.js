/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // Create ENUM type for roles
  await knex.raw(
    `CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'MEMBER')`,
  );

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("org_id")
      .notNullable()
      .references("id")
      .inTable("organizations")
      .onDelete("CASCADE");
    t.string("email", 255).notNullable().unique();
    t.string("password_hash", 255).notNullable();
    t.string("name", 255).notNullable();
    t.specificType("role", "user_role").notNullable().defaultTo("MEMBER");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Indexes on frequently queried fields
  await knex.schema.table("users", (t) => {
    t.index(["org_id"], "idx_users_org_id");
    t.index(["org_id", "role"], "idx_users_org_role");
  });

  await knex.raw(`
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("users");
  await knex.raw("DROP TYPE IF EXISTS user_role");
};
