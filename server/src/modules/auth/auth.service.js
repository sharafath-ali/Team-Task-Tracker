const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../../config/db");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../../utils/jwt.utils");
const { AppError } = require("../../middleware/error.middleware");

const SALT_ROUNDS = 12;

/** Convert org name to a URL-safe slug */
const toSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

/** SHA-256 hash a refresh token for safe DB storage */
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/** Days from now as a Date object */
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

// ─── Register ────────────────────────────────────────────────────
/**
 * Create a new organization and its first ADMIN user atomically.
 * Uses a Knex transaction — if either insert fails, both are rolled back.
 */
const register = async ({ orgName, name, email, password }) => {
  const existingUser = await db("users").where({ email }).first();
  if (existingUser) {
    throw new AppError(
      "An account with this email already exists",
      409,
      "CONFLICT",
    );
  }

  const slug = toSlug(orgName);
  const existingOrg = await db("organizations").where({ slug }).first();
  if (existingOrg) {
    throw new AppError(
      "An organization with this name already exists",
      409,
      "CONFLICT",
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return db.transaction(async (trx) => {
    const [org] = await trx("organizations")
      .insert({ name: orgName, slug })
      .returning(["id", "name", "slug", "created_at"]);

    const [user] = await trx("users")
      .insert({
        org_id: org.id,
        email,
        password_hash: passwordHash,
        name,
        role: "ADMIN",
      })
      .returning(["id", "org_id", "email", "name", "role", "created_at"]);

    return { org, user };
  });
};

// ─── Login ───────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  const user = await db("users").where({ email, is_active: true }).first();

  // Use same error for missing user AND wrong password (prevent user enumeration)
  const isValid = user && (await bcrypt.compare(password, user.password_hash));
  if (!isValid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const tokenPayload = { sub: user.id, orgId: user.org_id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await db("refresh_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: daysFromNow(7),
  });

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

// ─── Refresh Token Rotation ──────────────────────────────────────
/**
 * Verifies the incoming refresh token, revokes it, and issues a new pair.
 * This is refresh token rotation — if a revoked token is replayed, it signals compromise.
 */
const refresh = async (incomingToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "INVALID_TOKEN",
    );
  }

  const stored = await db("refresh_tokens")
    .where({ token_hash: hashToken(incomingToken), revoked: false })
    .where("expires_at", ">", new Date())
    .first();

  if (!stored) {
    throw new AppError(
      "Refresh token has been revoked or expired",
      401,
      "INVALID_TOKEN",
    );
  }

  const user = await db("users")
    .where({ id: payload.sub, is_active: true })
    .first();
  if (!user)
    throw new AppError("User not found or deactivated", 401, "UNAUTHORIZED");

  // Revoke old token
  await db("refresh_tokens").where({ id: stored.id }).update({ revoked: true });

  // Issue new pair
  const tokenPayload = { sub: user.id, orgId: user.org_id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  await db("refresh_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(newRefreshToken),
    expires_at: daysFromNow(7),
  });

  return { accessToken, refreshToken: newRefreshToken };
};

// ─── Logout ──────────────────────────────────────────────────────
const logout = async (refreshToken) => {
  if (!refreshToken) return;
  await db("refresh_tokens")
    .where({ token_hash: hashToken(refreshToken) })
    .update({ revoked: true });
};

// ─── Current User ────────────────────────────────────────────────
const getMe = async (userId) => {
  const user = await db("users")
    .join("organizations", "users.org_id", "organizations.id")
    .where("users.id", userId)
    .select(
      "users.id",
      "users.email",
      "users.name",
      "users.role",
      "users.org_id",
      "users.is_active",
      "users.created_at",
      "organizations.name as org_name",
      "organizations.slug as org_slug",
    )
    .first();

  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return user;
};

module.exports = { register, login, refresh, logout, getMe };
