const db = require("../../config/db");

/**
 * Overdue tasks count per user.
 * Overdue = due_date < NOW() AND status NOT IN ('DONE', 'BLOCKED')
 */
const getOverdueTasks = async ({ orgId }) => {
  const rows = await db("tasks")
    .join("users", "tasks.assignee_id", "users.id")
    .where("tasks.org_id", orgId)
    .whereNotNull("tasks.assignee_id")
    .whereNotIn("tasks.status", ["DONE", "BLOCKED"])
    .where("tasks.due_date", "<", db.fn.now())
    .groupBy("users.id", "users.name", "users.email")
    .select(
      "users.id as user_id",
      "users.name as user_name",
      "users.email as user_email",
      db.raw("COUNT(tasks.id)::int as overdue_count"),
    )
    .orderBy("overdue_count", "desc");

  return rows;
};

/**
 * Average task completion time per user (in hours).
 * Only counts tasks with status = DONE and completed_at set.
 */
const getAvgCompletionTime = async ({ orgId }) => {
  const rows = await db("tasks")
    .join("users", "tasks.assignee_id", "users.id")
    .where("tasks.org_id", orgId)
    .where("tasks.status", "DONE")
    .whereNotNull("tasks.completed_at")
    .whereNotNull("tasks.assignee_id")
    .groupBy("users.id", "users.name", "users.email")
    .select(
      "users.id as user_id",
      "users.name as user_name",
      "users.email as user_email",
      db.raw("COUNT(tasks.id)::int as completed_tasks"),
      db.raw(
        `ROUND(AVG(EXTRACT(EPOCH FROM (tasks.completed_at - tasks.created_at)) / 3600)::numeric, 2) as avg_hours`,
      ),
    )
    .orderBy("avg_hours", "asc");

  return rows;
};

module.exports = { getOverdueTasks, getAvgCompletionTime };
