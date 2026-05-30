const redis = require('../config/redis');
const env = require('../config/env');
const logger = require('./logger');

const TTL = Number(env.CACHE_TTL_SECONDS) || 300; // 5 minutes default

/**
 * Cache key strategy for task lists:
 *   cache:tasks:assignee:{assigneeId}:page:{page}:limit:{limit}:status:{status}:priority:{priority}
 *
 * Invalidation: SCAN + DEL on pattern  cache:tasks:assignee:{assigneeId}:*
 * This clears all paginated/filtered results for that assignee in one shot.
 */
const buildTaskCacheKey = ({ assigneeId, page = 1, limit = 20, status = 'all', priority = 'all' }) =>
  `cache:tasks:assignee:${assigneeId || 'all'}:page:${page}:limit:${limit}:status:${status}:priority:${priority}`;

/** Get a cached value — returns null on miss or error (cache-aside pattern) */
const get = async (key) => {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    logger.warn(`Cache GET failed [${key}]: ${err.message}`);
    return null;
  }
};

/** Set a value with TTL */
const set = async (key, value, ttl = TTL) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    logger.warn(`Cache SET failed [${key}]: ${err.message}`);
  }
};

/**
 * Invalidate all cached task lists for a specific assignee.
 * Uses Redis SCAN to safely delete keys matching the pattern
 * without blocking the server (unlike KEYS command).
 *
 * Called whenever a task is created, updated, or deleted.
 */
const invalidateAssigneeCache = async (assigneeId) => {
  if (!assigneeId) return;
  try {
    const pattern = `cache:tasks:assignee:${assigneeId}:*`;
    let cursor = '0';
    let deleted = 0;

    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    if (deleted > 0)
      logger.debug(`🗑️  Cache invalidated: ${deleted} key(s) for assignee ${assigneeId}`);
  } catch (err) {
    logger.warn(`Cache invalidation failed for ${assigneeId}: ${err.message}`);
  }
};

/** Invalidate ALL task cache (e.g. when org-level changes happen) */
const invalidateAllTaskCache = async () => {
  try {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'cache:tasks:*', 'COUNT', 100);
      cursor = next;
      if (keys.length) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');
    logger.debug(`🗑️  Full task cache cleared: ${deleted} key(s)`);
  } catch (err) {
    logger.warn(`Full cache invalidation failed: ${err.message}`);
  }
};

module.exports = { get, set, buildTaskCacheKey, invalidateAssigneeCache, invalidateAllTaskCache };
