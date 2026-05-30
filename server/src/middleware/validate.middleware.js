const { sendError } = require('../utils/response.utils');

/**
 * Joi validation middleware factory.
 * RBAC is enforced in rbac.middleware — this handles input validation.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), controller.register)
 *   router.get('/', validate(listQuerySchema, 'query'), controller.list)
 *
 * @param {import('joi').Schema} schema
 * @param {'body'|'query'|'params'} target
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,   // collect ALL errors, not just first
      stripUnknown: true,  // remove extra fields
      convert: true,       // coerce types (e.g. "1" → 1)
    });

    if (error) {
      const message = error.details
        .map((d) => d.message.replace(/['"]/g, ''))
        .join('; ');
      return sendError(res, 400, 'VALIDATION_ERROR', message);
    }

    req[target] = value; // replace with sanitized value
    next();
  };
};

module.exports = { validate };
