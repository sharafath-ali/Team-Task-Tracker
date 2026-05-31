const Joi = require("joi");

const registerSchema = Joi.object({
  orgName: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Organization name must be at least 2 characters",
    "any.required": "Organization name is required",
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Your full name is required",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
