/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // Task priority and status ENUMs
  await knex.raw(`CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH')`);
  await knex.raw(
    `CREATE TYPE task_status   AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED')`,
  );

  await knex.schema.createTable("tasks", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("org_id")
      .notNullable()
      .references("id")
      .inTable("organizations")
      .onDelete("CASCADE");
    t.uuid("project_id")
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");
    t.uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    t.uuid("assignee_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    t.string("title", 500).notNullable();
    t.text("description");
    t.specificType("priority", "task_priority")
      .notNullable()
      .defaultTo("MEDIUM");
    t.specificType("status", "task_status").notNullable().defaultTo("TODO");
    t.date("due_date").nullable();
    t.timestamp("completed_at").nullable(); // set when status transitions to DONE
    t.timestamps(true, true);
  });

  // --- Indexes on frequently queried fields (required by spec) ---
  await knex.schema.table("tasks", (t) => {
    t.index(["status"], "idx_tasks_status");
    t.index(["assignee_id"], "idx_tasks_assignee_id");
    t.index(["due_date"], "idx_tasks_due_date");
    t.index(["org_id", "status"], "idx_tasks_org_status");
    t.index(["project_id"], "idx_tasks_project_id");
    t.index(["org_id", "assignee_id"], "idx_tasks_org_assignee");
  });

  await knex.raw(`
    CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("tasks");
  await knex.raw("DROP TYPE IF EXISTS task_priority");
  await knex.raw("DROP TYPE IF EXISTS task_status");
};
