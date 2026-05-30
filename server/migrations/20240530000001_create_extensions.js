/** @param {import('knex').Knex} knex */
exports.up = (knex) => knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

/** @param {import('knex').Knex} knex */
exports.down = (knex) => knex.raw('DROP EXTENSION IF EXISTS "pgcrypto"');
