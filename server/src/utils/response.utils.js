/**
 * Standardized API response helpers.
 * Every endpoint uses these — ensures consistent shape across all responses.
 *
 * Success shape:  { status, data, ...meta }
 * Error shape:    { status, code, message }
 */

const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    status: statusCode,
    data,
    ...meta,
  });
};

const sendError = (res, statusCode, code, message) => {
  return res.status(statusCode).json({
    status: statusCode,
    code,
    message,
  });
};

module.exports = { sendSuccess, sendError };
