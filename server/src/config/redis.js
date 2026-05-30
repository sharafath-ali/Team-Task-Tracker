const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

// Supports both REDIS_URL (Redis Cloud) and password-based (Docker)
const redisConfig = env.REDIS_URL
  ? env.REDIS_URL
  : {
      host: 'redis',
      port: 6379,
      password: env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 10) return null; // stop retrying
        return Math.min(times * 100, 3000);
      },
    };

const redis = new Redis(redisConfig);

redis.on('connect', () => logger.info('🔴  Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('reconnecting', () => logger.warn('⚠️   Redis reconnecting...'));

module.exports = redis;
