/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  await knex.schema.createTable("project_members", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("project_id")
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");
    t.uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    t.string("project_role", 20).notNullable().defaultTo("MEMBER"); // OWNER | MEMBER
    t.timestamps(true, true);

    t.unique(["project_id", "user_id"]);
  });

  await knex.schema.table("project_members", (t) => {
    t.index(["project_id"], "idx_project_members_project_id");
    t.index(["user_id"], "idx_project_members_user_id");
  });

  await knex.raw(`
    CREATE TRIGGER trg_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = (knex) => knex.schema.dropTableIfExists("project_members");
