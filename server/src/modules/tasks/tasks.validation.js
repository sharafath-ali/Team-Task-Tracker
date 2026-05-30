const Joi = require('joi');

const createTaskSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(500).required().messages({ 'any.required': 'Task title is required' }),
  description: Joi.string().trim().max(5000).allow('', null),
  priority:    Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
  assignee_id: Joi.string().uuid().allow(null),
  project_id:  Joi.string().uuid().required().messages({ 'any.required': 'project_id is required' }),
  due_date:    Joi.date().iso().min('now').allow(null).messages({
    'date.min': 'due_date must be a future date',
  }),
});

const updateTaskSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(500),
  description: Joi.string().trim().max(5000).allow('', null),
  priority:    Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
  assignee_id: Joi.string().uuid().allow(null),
  due_date:    Joi.date().iso().allow(null),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED')
    .required()
    .messages({ 'any.required': 'status is required', 'any.only': 'status must be one of TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED' }),
});

const listTasksSchema = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(20),
  status:     Joi.string().valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'),
  priority:   Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
  assignee:   Joi.string().uuid(),
  project_id: Joi.string().uuid(),
});

module.exports = { createTaskSchema, updateTaskSchema, updateStatusSchema, listTasksSchema };
