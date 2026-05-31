const { verifyAccessToken } = require("../utils/jwt.utils");
const { sendError } = require("../utils/response.utils");
const db = require("../config/db");

/**
 * Verifies the Bearer access token and attaches req.user
 * Every protected route uses this middleware first.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authorization header missing or malformed",
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    // Load fresh user from DB to catch deactivated accounts
    const user = await db("users")
      .where({ id: payload.sub, is_active: true })
      .select("id", "org_id", "email", "name", "role", "is_active")
      .first();

    if (!user) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "User not found or deactivated",
      );
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, 401, "TOKEN_EXPIRED", "Access token has expired");
    }
    if (err.name === "JsonWebTokenError") {
      return sendError(res, 401, "INVALID_TOKEN", "Invalid access token");
    }
    next(err);
  }
};

module.exports = { authenticate };
