const redis = require('../config/redis');
const env = require('../config/env');
const logger = require('./logger');

const TTL = Number(env.CACHE_TTL_SECONDS) || 300; // 5 minutes default

/**
 * Cache key strategy for task lists:
 *   cache:tasks:project:{projectId}:assignee:{assigneeId}:page:{page}:limit:{limit}:status:{status}:priority:{priority}
 *
 * Invalidation strategy:
 *   1. On any task write → invalidate ALL keys for that project  (cache:tasks:project:{projectId}:*)
 *   2. On reassign       → also invalidate old assignee's keys    (cache:tasks:project:*:assignee:{oldId}:*)
 *
 * Uses Redis SCAN (non-blocking) instead of KEYS for safe pattern deletion.
 */
const buildTaskCacheKey = ({ projectId, assigneeId, page = 1, limit = 20, status = 'all', priority = 'all' }) =>
  `cache:tasks:project:${projectId || 'all'}:assignee:${assigneeId || 'all'}:page:${page}:limit:${limit}:status:${status}:priority:${priority}`;

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
 * Primary invalidator: wipe ALL cached task-list results for a project.
 *
 * Called on every create / update / status-change / delete so that
 * ADMIN/MANAGER "all-assignee" views are always refreshed alongside
 * per-assignee views.
 *
 * Pattern:  cache:tasks:project:{projectId}:*
 */
const invalidateProjectCache = async (projectId) => {
  if (!projectId) return;
  try {
    const pattern = `cache:tasks:project:${projectId}:*`;
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
      logger.debug(`🗑️  Cache invalidated: ${deleted} key(s) for project ${projectId}`);
  } catch (err) {
    logger.warn(`Cache invalidation failed for project ${projectId}: ${err.message}`);
  }
};

/**
 * Secondary invalidator: wipe all cached results for a specific assignee
 * across ALL projects (used on reassign so the old/new assignee views update).
 *
 * Pattern:  cache:tasks:project:*:assignee:{assigneeId}:*
 * Note: Redis SCAN with wildcard in the middle is safe but may need more iterations.
 */
const invalidateAssigneeCache = async (assigneeId) => {
  if (!assigneeId) return;
  try {
    const pattern = `cache:tasks:project:*:assignee:${assigneeId}:*`;
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
    logger.warn(`Cache invalidation failed for assignee ${assigneeId}: ${err.message}`);
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

module.exports = { get, set, buildTaskCacheKey, invalidateProjectCache, invalidateAssigneeCache, invalidateAllTaskCache };
