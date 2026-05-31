const db = require("../../config/db");
const { AppError } = require("../../middleware/error.middleware");

const SAFE_FIELDS = [
  "project_members.id",
  "project_members.project_id",
  "project_members.user_id",
  "project_members.project_role",
  "project_members.created_at",
  "users.name as user_name",
  "users.email as user_email",
  "users.role as org_role",
  "users.is_active",
];

// ─── List Members ────────────────────────────────────────────────
const listMembers = async ({ projectId, orgId }) => {
  // Verify project belongs to org
  const project = await db("projects")
    .where({ id: projectId, org_id: orgId })
    .first();
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");

  const members = await db("project_members")
    .join("users", "project_members.user_id", "users.id")
    .where("project_members.project_id", projectId)
    .select(SAFE_FIELDS)
    .orderBy("project_members.created_at", "asc");

  return members;
};

// ─── Add Member ──────────────────────────────────────────────────
const addMember = async ({
  projectId,
  orgId,
  userId,
  projectRole = "MEMBER",
}) => {
  // Verify project belongs to org
  const project = await db("projects")
    .where({ id: projectId, org_id: orgId })
    .first();
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");

  // Verify user belongs to org
  const user = await db("users")
    .where({ id: userId, org_id: orgId, is_active: true })
    .first();
  if (!user)
    throw new AppError("User not found in your organization", 404, "NOT_FOUND");

  // Check for existing membership
  const existing = await db("project_members")
    .where({ project_id: projectId, user_id: userId })
    .first();
  if (existing)
    throw new AppError(
      "User is already a member of this project",
      409,
      "CONFLICT",
    );

  const [member] = await db("project_members")
    .insert({
      project_id: projectId,
      user_id: userId,
      project_role: projectRole,
    })
    .returning("*");

  // Return with user details
  const full = await db("project_members")
    .join("users", "project_members.user_id", "users.id")
    .where("project_members.id", member.id)
    .select(SAFE_FIELDS)
    .first();

  return full;
};

// ─── Remove Member ───────────────────────────────────────────────
const removeMember = async ({ projectId, orgId, userId }) => {
  const project = await db("projects")
    .where({ id: projectId, org_id: orgId })
    .first();
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");

  const membership = await db("project_members")
    .where({ project_id: projectId, user_id: userId })
    .first();
  if (!membership)
    throw new AppError(
      "User is not a member of this project",
      404,
      "NOT_FOUND",
    );

  // Prevent removing the last OWNER
  if (membership.project_role === "OWNER") {
    const ownerCount = await db("project_members")
      .where({ project_id: projectId, project_role: "OWNER" })
      .count("* as count")
      .first();
    if (parseInt(ownerCount.count) <= 1) {
      throw new AppError(
        "Cannot remove the last owner of a project",
        400,
        "INVALID_OPERATION",
      );
    }
  }

  await db("project_members")
    .where({ project_id: projectId, user_id: userId })
    .del();
};

// ─── Update Member Role ──────────────────────────────────────────
const updateMemberRole = async ({ projectId, orgId, userId, projectRole }) => {
  const project = await db("projects")
    .where({ id: projectId, org_id: orgId })
    .first();
  if (!project) throw new AppError("Project not found", 404, "NOT_FOUND");

  const membership = await db("project_members")
    .where({ project_id: projectId, user_id: userId })
    .first();
  if (!membership)
    throw new AppError(
      "User is not a member of this project",
      404,
      "NOT_FOUND",
    );

  const [updated] = await db("project_members")
    .where({ project_id: projectId, user_id: userId })
    .update({ project_role: projectRole })
    .returning("*");

  return updated;
};

module.exports = { listMembers, addMember, removeMember, updateMemberRole };
