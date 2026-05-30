require('dotenv').config();
const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),
  POSTGRES_USER: Joi.string().default('taskadmin'),
  POSTGRES_PASSWORD: Joi.string().default('taskpassword'),
  POSTGRES_DB: Joi.string().default('tasktracker'),

  REDIS_URL: Joi.string().optional(),
  REDIS_PASSWORD: Joi.string().default('redispassword'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CACHE_TTL_SECONDS: Joi.number().default(300),
}).unknown(true);

const { error, value } = schema.validate(process.env);

if (error) {
  console.error('❌  Environment validation failed:', error.message);
  process.exit(1);
}

module.exports = value;
