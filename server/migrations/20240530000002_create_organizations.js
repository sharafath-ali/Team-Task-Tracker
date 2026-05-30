/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  await knex.schema.createTable('organizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 255).notNullable().unique();
    t.string('slug', 255).notNullable().unique();
    t.timestamps(true, true); // created_at, updated_at with DEFAULT NOW()
  });

  // Auto-update updated_at on any row update
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('organizations');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
};
