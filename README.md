# Team Task Tracker API

A production-ready REST API for managing tasks within a team, built for the SDE II take-home assignment. Includes authentication with JWT refresh token rotation, role-based access control (RBAC), Redis caching with invalidation, enforced task status transitions, an analytics bonus endpoint, and a full React frontend — all containerized with Docker Compose.

---

## Tech Stack

| Layer        | Technology                                   |
|--------------|----------------------------------------------|
| Runtime      | Node.js 20 + Express                         |
| Database     | PostgreSQL 16 (via Knex.js query builder)    |
| Cache        | Redis 7                                      |
| Auth         | JWT (access token 15m + refresh token 7d)    |
| Validation   | Joi                                          |
| Frontend     | React 18 + Vite + Zustand                    |
| API Docs     | Swagger / OpenAPI 3.0 (`/api/docs`)          |
| Container    | Docker + Docker Compose                      |

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone & configure

```bash
git clone <repo-url>
cd team-task-tracker
cp .env.example .env          # defaults work out of the box
```

### 2. Start everything

```bash
docker compose up
```

That's it. Docker Compose will:
1. Start **PostgreSQL** and **Redis** with health checks
2. Start the **Express API** — automatically runs DB migrations on boot
3. Expose the **API** at `http://localhost:5000`
4. Expose **Swagger docs** at `http://localhost:5000/api/docs`
5. Expose **pgAdmin** at `http://localhost:5050` (email: `admin@tasktracker.com` / pw: `admin`)
6. Expose **RedisInsight** at `http://localhost:8001`

> **Frontend (optional):** The React client runs via a Docker Compose profile to keep the default startup lean.
> ```bash
> docker compose --profile frontend up
> ```
> Frontend available at `http://localhost:3000`

### 3. Seed demo data (optional)

```bash
docker compose exec server node seeds/01_initial_seed.js
```

This creates a demo organization with three users:

| Email                   | Password      | Role    |
|-------------------------|---------------|---------|
| `admin@acme.com`        | `password123` | ADMIN   |
| `manager@acme.com`      | `password123` | MANAGER |
| `member@acme.com`       | `password123` | MEMBER  |

---

## API Overview

### Base URL
```
http://localhost:5000/api
```

### Interactive Docs
Swagger UI is available at: **`http://localhost:5000/api/docs`**

### Endpoint Summary

#### Auth
| Method | Endpoint             | Description                            | Auth |
|--------|----------------------|----------------------------------------|------|
| POST   | `/auth/register`     | Register org + first ADMIN user        | —    |
| POST   | `/auth/login`        | Login, returns access + refresh tokens | —    |
| POST   | `/auth/refresh`      | Rotate refresh token                   | —    |
| POST   | `/auth/logout`       | Revoke refresh token                   | ✓    |
| GET    | `/auth/me`           | Get current user profile               | ✓    |

#### Users *(ADMIN only for mutations)*
| Method | Endpoint      | Description                |
|--------|---------------|----------------------------|
| GET    | `/users`      | List users (paginated)     |
| POST   | `/users`      | Create/invite a user       |
| GET    | `/users/:id`  | Get user by ID             |
| PATCH  | `/users/:id`  | Update role or status      |
| DELETE | `/users/:id`  | Soft-deactivate a user     |

#### Projects *(ADMIN/MANAGER)*
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/projects`           | List projects            |
| POST   | `/projects`           | Create a project         |
| GET    | `/projects/:id`       | Get project              |
| PATCH  | `/projects/:id`       | Update project           |
| DELETE | `/projects/:id`       | Delete project           |
| GET    | `/projects/:id/members` | List members           |
| POST   | `/projects/:id/members` | Add member             |
| DELETE | `/projects/:id/members/:userId` | Remove member |

#### Tasks
| Method | Endpoint             | Description                                  | Access              |
|--------|----------------------|----------------------------------------------|---------------------|
| GET    | `/tasks`             | List tasks (paginated + filtered)            | All (MEMBER sees own) |
| POST   | `/tasks`             | Create a task                                | ADMIN, MANAGER      |
| GET    | `/tasks/:id`         | Get task by ID                               | All (MEMBER sees own) |
| PATCH  | `/tasks/:id`         | Update task fields                           | All (MEMBER sees own) |
| PATCH  | `/tasks/:id/status`  | Advance task status (state machine enforced) | Assignee, MANAGER, ADMIN |
| DELETE | `/tasks/:id`         | Delete task                                  | ADMIN, MANAGER      |

#### Analytics *(ADMIN/MANAGER only)*
| Method | Endpoint                       | Description                        |
|--------|--------------------------------|------------------------------------|
| GET    | `/analytics/overdue`           | Overdue task count per user        |
| GET    | `/analytics/completion-time`   | Avg task completion time (hours)   |

### Task Status Transitions

Status transitions are enforced server-side via a state machine — free-form updates are rejected:

```
TODO ──────────► IN_PROGRESS ──────────► IN_REVIEW ──────────► DONE
  ╲                  ╲                      ╱  ╲
   ╲                  ╲                    ╱    ╲
    ╲──────────────────► BLOCKED ◄────────       (re-enters TODO or IN_PROGRESS)
```

Only the **assignee** or a **MANAGER/ADMIN** can advance a task's status.

### Error Response Format

All errors follow a consistent structure:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date"
}
```

---

## Authentication

The API uses **JWT with refresh token rotation**:

1. `POST /api/auth/login` → returns `accessToken` (15 min TTL) + `refreshToken` (7 day TTL, stored in DB)
2. Attach `Authorization: Bearer <accessToken>` to protected requests
3. When the access token expires, call `POST /api/auth/refresh` with the refresh token to get a new pair. The old refresh token is **revoked immediately** (rotation).
4. `POST /api/auth/logout` revokes the refresh token entirely.

---

## Caching Strategy

### What is cached

Task list responses are cached in Redis using a **cache-aside (lazy loading)** pattern.

**Cache key format:**
```
cache:tasks:assignee:{assigneeId}:page:{page}:limit:{limit}:status:{status}:priority:{priority}
```

- When a MEMBER queries their tasks, `assigneeId` is forced to their own user ID.
- ADMIN/MANAGER queries with no assignee filter use `all` as the assignee segment.
- Each unique combination of filters gets its own cache entry.
- **TTL:** 5 minutes (configurable via `CACHE_TTL_SECONDS` env var).

### Invalidation strategy

Cache invalidation happens on every **write operation**:

| Event                       | Keys invalidated                                         |
|-----------------------------|----------------------------------------------------------|
| Task created                | All keys for `assignee:{assignee_id}:*`                  |
| Task updated (same assignee)| All keys for `assignee:{assignee_id}:*`                  |
| Task reassigned             | All keys for both old AND new assignee                   |
| Task status changed         | All keys for `assignee:{task.assignee_id}:*`             |
| Task deleted                | All keys for `assignee:{task.assignee_id}:*`             |

**Implementation:** Uses Redis `SCAN` (not `KEYS`) to delete pattern-matched keys without blocking the event loop. This is safe under large keyspaces and avoids the O(N) blocking `KEYS` command.

### Why cache-aside over write-through?

Write-through caching would require updating the cache on every write, which means reconstructing the full paginated result on every task mutation. Since task lists are parameterised (page, limit, status, priority, assignee), it's impractical to keep all variants consistent on write. Cache-aside is simpler and correct — stale data can only exist for the TTL window, and writes immediately invalidate the relevant entries.

---

## Database Design

### Schema

> 📊 **[View full schema diagram with ERD → `schema_diagram.md`](./schema_diagram.md)**

The database has 6 tables scoped under an `organizations` root tenant:

| Table | Purpose |
|-------|---------|
| `organizations` | Root tenant — all data scoped under one org |
| `users` | Members with `ADMIN` / `MANAGER` / `MEMBER` role ENUM |
| `refresh_tokens` | Hashed JWT refresh tokens with revocation support |
| `projects` | Projects per org, created by a user |
| `project_members` | Many-to-many join (users ↔ projects) with `OWNER`/`MEMBER` per-project roles |
| `tasks` | Tasks with `priority` and `status` ENUMs, assignee, due date, completion timestamp |

### Indexes

The following indexes are defined on the `tasks` table for the most frequent query patterns:

| Index name             | Columns                  | Reason                                               |
|------------------------|--------------------------|------------------------------------------------------|
| `idx_tasks_status`     | `status`                 | Filtering by status is the most common list query    |
| `idx_tasks_assignee_id`| `assignee_id`            | MEMBER task isolation; cache invalidation by assignee|
| `idx_tasks_due_date`   | `due_date`               | Analytics overdue queries + sorting                  |
| `idx_tasks_org_status` | `(org_id, status)`       | Composite for org-scoped status filters              |
| `idx_tasks_org_assignee`| `(org_id, assignee_id)` | Composite covering the most frequent list query      |
| `idx_tasks_project_id` | `project_id`             | Project-scoped task views                            |

### Design Decision: Composite indexes over single-column indexes

The two most-frequent queries in this system are:

1. *"List all TODO tasks for org X"* → hits `idx_tasks_org_status`
2. *"List all tasks assigned to user Y in org X"* → hits `idx_tasks_org_assignee`

A single-column index on `org_id` would still require a heap scan for every task in the org. The composite indexes allow PostgreSQL to satisfy both the `org_id` equality and the secondary column filter from the index alone (index-only scan), significantly reducing I/O at scale. The tradeoff is slightly higher write overhead — acceptable given the read-heavy nature of task list queries.

### Design Decision: `org_id` on the `tasks` table (denormalization)

Tasks could be scoped to an org purely through the `project → org` join chain. Instead, `org_id` is stored directly on `tasks` as a redundant foreign key. This allows every task query to be `WHERE tasks.org_id = ?` without a join, which simplifies query planning and is critical for the composite indexes above to work efficiently.

---

## RBAC Model

Role-based access is enforced **entirely at the middleware layer** (`rbac.middleware.js`). Controller logic contains zero role checks.

| Action                      | ADMIN | MANAGER | MEMBER |
|-----------------------------|-------|---------|--------|
| Manage users                | ✅    | ❌      | ❌     |
| Manage projects             | ✅    | ✅      | ❌     |
| Create tasks                | ✅    | ✅      | ❌     |
| View tasks (all org)        | ✅    | ✅      | ❌ (own only) |
| Update own assigned tasks   | ✅    | ✅      | ✅     |
| Advance task status         | ✅    | ✅      | ✅ (own only) |
| Delete tasks                | ✅    | ✅      | ❌     |
| View analytics              | ✅    | ✅      | ❌     |

---

## Running Locally (Without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

```bash
# Server
cd server
cp .env.example .env    # fill in your local DB/Redis URLs
npm install
npm run migrate         # runs Knex migrations
npm run seed            # optional demo data
npm run dev             # starts on :5000 with nodemon

# Client (separate terminal)
cd client
npm install
npm run dev             # starts on :5173
```

---

## What I Would Improve Given More Time

1. **Unit & integration tests** — At minimum: auth flow tests (register → login → refresh → logout) and task status transition validation tests. These are the two highest-risk flows.

2. **WebSocket / SSE notifications** — Real-time push to the assignee when their task status changes. The groundwork (completed_at tracking, per-user assignee model) is already in place.

3. **Email notifications** — Notify assignees when a task is assigned or approaching its due date. Would integrate with a transactional email service (Resend / SendGrid).

4. **Refresh token family tracking** — Currently rotation revokes a single token. A "token family" approach would detect refresh token reuse (sign of theft) and revoke the entire family.

5. **Rate limiting** — Add `express-rate-limit` on auth endpoints to prevent brute-force attacks.

6. **Soft delete for tasks** — Currently tasks are hard-deleted. A `deleted_at` column would preserve audit history.

7. **Event sourcing for task status history** — A `task_status_history` table recording every transition with timestamp and actor, useful for detailed audit trails and the analytics module.

8. **Full-text search on task titles** — PostgreSQL `tsvector` + GIN index for searching tasks by keyword.

---

## Project Structure

```
team-task-tracker/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── server/
│   ├── Dockerfile
│   ├── server.js              # Entry point
│   ├── knexfile.js
│   ├── migrations/            # Knex migrations (run automatically on boot)
│   ├── seeds/                 # Demo data seed
│   └── src/
│       ├── app.js             # Express app setup
│       ├── swagger.js         # OpenAPI spec config
│       ├── config/
│       │   ├── db.js          # Knex connection
│       │   ├── env.js         # Validated env vars
│       │   └── redis.js       # Redis client
│       ├── middleware/
│       │   ├── auth.middleware.js    # JWT verification
│       │   ├── rbac.middleware.js    # Role enforcement (authorize factory)
│       │   ├── validate.middleware.js
│       │   └── error.middleware.js
│       ├── utils/
│       │   ├── jwt.utils.js
│       │   ├── cache.utils.js       # Redis cache-aside helpers
│       │   ├── taskTransitions.js   # Status state machine
│       │   ├── response.utils.js
│       │   └── logger.js
│       └── modules/
│           ├── auth/
│           ├── users/
│           ├── projects/
│           ├── tasks/
│           └── analytics/
│
└── client/                    # React + Vite frontend
    ├── Dockerfile
    └── src/
        ├── api/               # Axios service layer
        ├── store/             # Zustand state
        ├── components/        # Layout, TaskModal
        └── pages/             # Login, Register, Board, Dashboard, Projects, Users
```
