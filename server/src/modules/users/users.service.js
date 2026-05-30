const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { AppError } = require('../../middleware/error.middleware');

const SAFE_FIELDS = ['id', 'org_id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at'];

// ─── List Users ──────────────────────────────────────────────────
const listUsers = async ({ orgId, page = 1, limit = 20, role }) => {
  const offset = (page - 1) * limit;

  const query = db('users').where({ org_id: orgId });
  if (role) query.where({ role });

  const [{ count }] = await db('users').where({ org_id: orgId }).modify((q) => { if (role) q.where({ role }); }).count('id as count');
  const users = await query.select(SAFE_FIELDS).offset(offset).limit(limit).orderBy('created_at', 'desc');

  return {
    users,
    pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
  };
};

// ─── Get One ─────────────────────────────────────────────────────
const getUserById = async ({ userId, orgId }) => {
  const user = await db('users').where({ id: userId, org_id: orgId }).select(SAFE_FIELDS).first();
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
};

// ─── Create User (ADMIN invites a new member) ────────────────────
const createUser = async ({ orgId, name, email, password, role }) => {
  const existing = await db('users').where({ email }).first();
  if (existing) throw new AppError('A user with this email already exists', 409, 'CONFLICT');

  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await db('users')
    .insert({ org_id: orgId, name, email, password_hash, role })
    .returning(SAFE_FIELDS);
  return user;
};

// ─── Update User ─────────────────────────────────────────────────
const updateUser = async ({ userId, orgId, updates }) => {
  const user = await db('users').where({ id: userId, org_id: orgId }).first();
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const [updated] = await db('users')
    .where({ id: userId })
    .update(updates)
    .returning(SAFE_FIELDS);
  return updated;
};

// ─── Deactivate User (soft delete) ───────────────────────────────
const deactivateUser = async ({ userId, orgId, requesterId }) => {
  if (userId === requesterId) throw new AppError('You cannot deactivate your own account', 400, 'INVALID_OPERATION');

  const user = await db('users').where({ id: userId, org_id: orgId }).first();
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const [updated] = await db('users').where({ id: userId }).update({ is_active: false }).returning(SAFE_FIELDS);
  return updated;
};

module.exports = { listUsers, getUserById, createUser, updateUser, deactivateUser };
