const db = require("../../config/db");
const { AppError } = require("../../middleware/error.middleware");

// ─── List Projects ───────────────────────────────────────────────
// ADMIN sees all projects; MANAGER/MEMBER only see projects they're a member of
const listProjects = async ({
  orgId,
  userId,
  userRole,
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;

  let baseQuery = db("projects").where("projects.org_id", orgId);

  if (userRole !== "ADMIN") {
    // Non-admins only see projects they are explicitly a member of
    baseQuery = baseQuery.join("project_members", function () {
      this.on("project_members.project_id", "=", "projects.id").andOn(
        "project_members.user_id",
        "=",
        db.raw("?", [userId]),
      );
    });
  }

  const [{ count }] = await baseQuery.clone().count("projects.id as count");

  const projects = await baseQuery
    .clone()
    .leftJoin("users as creator", "projects.created_by", "creator.id")
    // Member count sub-query
    .leftJoin(
      db("project_members")
        .select("project_id")
        .count("* as member_count")
        .groupBy("project_id")
        .as("mc"),
      "mc.project_id",
      "projects.id",
    )
    // Open task count sub-query
    .leftJoin(
      db("tasks")
        .select("project_id")
        .count("* as open_task_count")
        .whereNotIn("status", ["DONE"])
        .groupBy("project_id")
        .as("otc"),
      "otc.project_id",
      "projects.id",
    )
    // Total task count sub-query
    .leftJoin(
      db("tasks")
        .select("project_id")
        .count("* as total_task_count")
        .groupBy("project_id")
        .as("ttc"),
      "ttc.project_id",
      "projects.id",
    )
    // Latest task update for "recent activity"
    .leftJoin(
      db("tasks")
        .select("project_id")
        .max("updated_at as last_activity")
        .groupBy("project_id")
        .as("la"),
      "la.project_id",
      "projects.id",
    )
    .select(
      "projects.*",
      "creator.name as created_by_name",
      db.raw("COALESCE(mc.member_count, 0)::int as member_count"),
      db.raw("COALESCE(otc.open_task_count, 0)::int as open_task_count"),
      db.raw("COALESCE(ttc.total_task_count, 0)::int as total_task_count"),
      "la.last_activity",
    )
    .orderBy("projects.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return {
    projects,
    pagination: {
      page,
      limit,
      total: parseInt(count),
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── Get One ─────────────────────────────────────────────────────
const getProjectById = async ({ projectId, orgId, userId, userRole }) => {
  let query = db("projects")
    .leftJoin("users as creator", "projects.created_by", "creator.id")
    .leftJoin(
      db("project_members")
        .select("project_id")
        .count("* as member_count")
        .groupBy("project_id")
        .as("mc"),
      "mc.project_id",
      "projects.id",
    )
    .leftJoin(
      db("tasks")
        .select("project_id")
        .count("* as total_task_count")
        .groupBy("project_id")
        .as("ttc"),
      "ttc.project_id",
      "projects.id",
    )
    .leftJoin(
      db("tasks")
        .select("project_id")
        .count("* as open_task_count")
        .whereNotIn("status", ["DONE"])
        .groupBy("project_id")
        .as("otc"),
      "otc.project_id",
      "projects.id",
    )
    .where({ "projects.id": projectId, "projects.org_id": orgId })
    .select(
      "projects.*",
      "creator.name as created_by_name",
      db.raw("COALESCE(mc.member_count, 0)::int as member_count"),
      db.raw("COALESCE(ttc.total_task_count, 0)::int as total_task_count"),
      db.raw("COALESCE(otc.open_task_count, 0)::int as open_task_count"),
    )
    .first();

  const project = await query;
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");

  // Non-admins must be a member
  if (userRole !== "ADMIN") {
    const membership = await db("project_members")
      .where({ project_id: projectId, user_id: userId })
      .first();
    if (!membership)
      throw new AppError(
        "You are not a member of this project",
        403,
        "FORBIDDEN",
      );
  }

  return project;
};

// ─── Create ──────────────────────────────────────────────────────
const createProject = async ({ orgId, createdBy, name, description }) => {
  const [project] = await db("projects")
    .insert({ org_id: orgId, created_by: createdBy, name, description })
    .returning("*");

  // Auto-add creator as OWNER
  await db("project_members").insert({
    project_id: project.id,
    user_id: createdBy,
    project_role: "OWNER",
  });

  return project;
};

// ─── Update ──────────────────────────────────────────────────────
const updateProject = async ({ projectId, orgId, updates }) => {
  const project = await db("projects")
    .where({ id: projectId, org_id: orgId })
    .first();
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");
  const [updated] = await db("projects")
    .where({ id: projectId })
    .update(updates)
    .returning("*");
  return updated;
};

// ─── Delete ──────────────────────────────────────────────────────
const deleteProject = async ({ projectId, orgId }) => {
  const project = await db("projects")
    .where({ id: projectId, org_id: orgId })
    .first();
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");
  await db("projects").where({ id: projectId }).del();
};

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
