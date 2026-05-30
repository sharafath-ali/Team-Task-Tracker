const logger = require('../utils/logger');

/**
 * Custom application error class.
 * Throw this anywhere in services — error.middleware picks it up.
 *
 * @example
 *   throw new AppError('User not found', 404, 'NOT_FOUND')
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isAppError = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handler.
 * Must be the LAST middleware in app.js.
 * Normalizes all errors into the required response shape:
 *   { status, code, message }
 */
const errorMiddleware = (err, req, res, _next) => {
  logger.error(`[${req.method}] ${req.originalUrl} → ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  // Known AppError (thrown from services)
  if (err.isAppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({
      status: 409,
      code: 'CONFLICT',
      message: 'A record with this value already exists',
    });
  }

  // PostgreSQL foreign key constraint violation
  if (err.code === '23503') {
    return res.status(400).json({
      status: 400,
      code: 'INVALID_REFERENCE',
      message: 'Referenced resource does not exist',
    });
  }

  // Knex validation / query errors
  if (err.code === '22P02') {
    return res.status(400).json({
      status: 400,
      code: 'INVALID_INPUT',
      message: 'Invalid UUID or data format',
    });
  }

  // JWT errors (shouldn't reach here but just in case)
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 401, code: 'TOKEN_EXPIRED', message: 'Access token has expired' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 401, code: 'INVALID_TOKEN', message: 'Invalid access token' });
  }

  // Generic 500
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = { errorMiddleware, AppError };
