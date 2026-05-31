const bcrypt = require("bcryptjs");
const db = require("../config/db");

/**
 * Seed: Creates demo data so the reviewer can hit the API immediately
 * after docker compose up without manual setup.
 *
 * Org:     Demo Organization
 * Users:
 *   admin@demo.com   / password123  (ADMIN)
 *   manager@demo.com / password123  (MANAGER)
 *   member@demo.com  / password123  (MEMBER)
 * Project: Alpha Launch
 * Tasks:   4 tasks across different statuses & priorities
 */
exports.seed = async (knex) => {
  // Clean in reverse FK order
  await knex("tasks").del();
  await knex("project_members").del();
  await knex("projects").del();
  await knex("refresh_tokens").del();
  await knex("users").del();
  await knex("organizations").del();

  const hash = await bcrypt.hash("password123", 12);

  // Organization
  const [org] = await knex("organizations")
    .insert({ name: "Demo Organization", slug: "demo-organization" })
    .returning("*");

  // Users
  const [admin] = await knex("users")
    .insert({
      org_id: org.id,
      email: "admin@demo.com",
      password_hash: hash,
      name: "Admin User",
      role: "ADMIN",
    })
    .returning("*");

  const [manager] = await knex("users")
    .insert({
      org_id: org.id,
      email: "manager@demo.com",
      password_hash: hash,
      name: "Manager User",
      role: "MANAGER",
    })
    .returning("*");

  const [member] = await knex("users")
    .insert({
      org_id: org.id,
      email: "member@demo.com",
      password_hash: hash,
      name: "Member User",
      role: "MEMBER",
    })
    .returning("*");

  // Project
  const [project] = await knex("projects")
    .insert({
      org_id: org.id,
      created_by: admin.id,
      name: "Alpha Launch",
      description: "Q3 product launch project",
    })
    .returning("*");

  // Project Members — assign all demo users to Alpha Launch
  await knex("project_members").insert([
    { project_id: project.id, user_id: admin.id, project_role: "OWNER" },
    { project_id: project.id, user_id: manager.id, project_role: "MEMBER" },
    { project_id: project.id, user_id: member.id, project_role: "MEMBER" },
  ]);

  // Tasks
  await knex("tasks").insert([
    {
      org_id: org.id,
      project_id: project.id,
      created_by: admin.id,
      assignee_id: member.id,
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for automated deploys",
      priority: "HIGH",
      status: "TODO",
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    },
    {
      org_id: org.id,
      project_id: project.id,
      created_by: manager.id,
      assignee_id: member.id,
      title: "Write API documentation",
      description: "Document all endpoints with Swagger/OpenAPI",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      org_id: org.id,
      project_id: project.id,
      created_by: admin.id,
      assignee_id: manager.id,
      title: "Design database schema",
      description: "Finalize ERD and indexes",
      priority: "HIGH",
      status: "IN_REVIEW",
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      org_id: org.id,
      project_id: project.id,
      created_by: admin.id,
      assignee_id: admin.id,
      title: "Project kickoff meeting",
      description: "Align on goals and timeline",
      priority: "LOW",
      status: "DONE",
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // already past
      completed_at: new Date(),
    },
  ]);

  console.log("✅  Seed complete — demo credentials:");
  console.log("    admin@demo.com   / password123  (ADMIN)");
  console.log("    manager@demo.com / password123  (MANAGER)");
  console.log("    member@demo.com  / password123  (MEMBER)");
};
