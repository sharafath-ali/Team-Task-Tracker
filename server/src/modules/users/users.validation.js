const Joi = require("joi");

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required(),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
  }),
  role: Joi.string().valid("ADMIN", "MANAGER", "MEMBER").default("MEMBER"),
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid("ADMIN", "MANAGER", "MEMBER"),
  is_active: Joi.boolean(),
})
  .min(1)
  .messages({ "object.min": "At least one field is required" });

const listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid("ADMIN", "MANAGER", "MEMBER"),
});

module.exports = { createUserSchema, updateUserSchema, listUsersSchema };
