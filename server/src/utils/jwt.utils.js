const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate a short-lived access token (default 15m)
 * @param {{ sub: string, orgId: string, role: string }} payload
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'team-task-tracker',
  });

/**
 * Generate a long-lived refresh token (default 7d)
 * Stored hashed in DB — never persisted in plain text.
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'team-task-tracker',
  });

/**
 * Verify access token — throws JsonWebTokenError or TokenExpiredError on failure
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'team-task-tracker' });

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'team-task-tracker' });

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
