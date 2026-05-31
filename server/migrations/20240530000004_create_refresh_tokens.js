/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  await knex.schema.createTable("refresh_tokens", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    t.string("token_hash", 255).notNullable();
    t.timestamp("expires_at").notNullable();
    t.boolean("revoked").notNullable().defaultTo(false);
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.table("refresh_tokens", (t) => {
    t.index(["user_id"], "idx_refresh_tokens_user_id");
    t.index(["token_hash"], "idx_refresh_tokens_hash");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = (knex) => knex.schema.dropTableIfExists("refresh_tokens");
