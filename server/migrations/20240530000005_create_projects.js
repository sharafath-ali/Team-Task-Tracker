/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  await knex.schema.createTable("projects", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("org_id")
      .notNullable()
      .references("id")
      .inTable("organizations")
      .onDelete("CASCADE");
    t.uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    t.string("name", 255).notNullable();
    t.text("description");
    t.timestamps(true, true);
  });

  await knex.schema.table("projects", (t) => {
    t.index(["org_id"], "idx_projects_org_id");
  });

  await knex.raw(`
    CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = (knex) => knex.schema.dropTableIfExists("projects");
