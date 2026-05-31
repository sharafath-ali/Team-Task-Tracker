const Joi = require("joi");

const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required().messages({
    "any.required": "Project name is required",
  }),
  description: Joi.string().trim().max(2000).allow("", null),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255),
  description: Joi.string().trim().max(2000).allow("", null),
}).min(1);

const listProjectsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
};
