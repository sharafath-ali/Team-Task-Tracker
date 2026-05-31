import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Calendar, AlertTriangle } from "lucide-react";
import { listTasks, updateStatus, deleteTask } from "../api/tasks.api";
import { listProjects } from "../api/projects.api";
import useAuthStore from "../store/authStore";
import TaskModal from "../components/TaskModal";

const COLUMNS = [
  { key: "TODO", label: "To Do", color: "var(--status-todo)" },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    color: "var(--status-in-progress)",
  },
  { key: "IN_REVIEW", label: "In Review", color: "var(--status-in-review)" },
  { key: "DONE", label: "Done", color: "var(--status-done)" },
  { key: "BLOCKED", label: "Blocked", color: "var(--status-blocked)" },
];

const TRANSITIONS = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  BLOCKED: ["TODO", "IN_PROGRESS"],
  DONE: [],
};

const STATUS_LABELS = {
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  TODO: "To Do",
  DONE: "Done",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ priority: "", project_id: "" });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () =>
      listTasks({ ...filters, limit: 100 }).then((r) => r.data.data),
  });

  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects({ limit: 100 }).then((r) => r.data.data),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = data?.tasks || [];
  const projects = projData?.projects || [];

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  // Stats
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const overdue = tasks.filter(
    (t) =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== "DONE",
  ).length;
  const high = tasks.filter(
    (t) => t.priority === "HIGH" && t.status !== "DONE",
  ).length;

  const canCreate = ["ADMIN", "MANAGER"].includes(user?.role);
  const hasFilters = filters.priority || filters.project_id;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Board</h1>
          <p className="page-subtitle">
            {user?.org_name}
            {user?.role === "MEMBER"
              ? " · Showing tasks assigned to you"
              : ` · ${total} task${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        {canCreate && (
          <button
            id="create-task-btn"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} />
            New Task
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card accent-blue">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{total}</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Completed</div>
            <div className="stat-value" style={{ color: "var(--success)" }}>
              {done}
            </div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Overdue</div>
            <div
              className="stat-value"
              style={{
                color: overdue > 0 ? "var(--danger)" : "var(--text-primary)",
              }}
            >
              {overdue}
            </div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">High Priority</div>
            <div
              className="stat-value"
              style={{
                color: high > 0 ? "var(--warning)" : "var(--text-primary)",
              }}
            >
              {high}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="board-filters">
          <span className="filter-label">
            <Filter
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 4,
              }}
            />
            Filter:
          </span>
          <select
            id="filter-priority"
            className="form-select"
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({ ...f, priority: e.target.value }))
            }
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <select
            id="filter-project"
            className="form-select"
            value={filters.project_id}
            onChange={(e) =>
              setFilters((f) => ({ ...f, project_id: e.target.value }))
            }
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters({ priority: "", project_id: "" })}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        ) : (
          <div className="kanban-board">
            {COLUMNS.map((col) => (
              <div key={col.key} className={`kanban-column col-${col.key}`}>
                <div className="kanban-header">
                  <div className="kanban-title">
                    <span className="kanban-dot" />
                    {col.label}
                  </div>
                  <span className="kanban-count">
                    {tasksByStatus[col.key]?.length || 0}
                  </span>
                </div>

                {tasksByStatus[col.key]?.length === 0 ? (
                  <div className="kanban-column-cards">
                    <div className="empty-column">
                      <div className="empty-column-icon">○</div>
                      No tasks
                    </div>
                  </div>
                ) : (
                  <div className="kanban-column-cards">
                    {tasksByStatus[col.key].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        userRole={user?.role}
                        userId={user?.id}
                        transitions={TRANSITIONS[task.status] || []}
                        onStatusChange={(status) =>
                          statusMut.mutate({ id: task.id, status })
                        }
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Modal — view/edit */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          onClose={() => setSelectedTask(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["tasks"] });
            setSelectedTask(null);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <TaskModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["tasks"] });
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}

// ─── Task Card Component ──────────────────────────────────────────
function TaskCard({
  task,
  userRole,
  userId,
  transitions,
  onStatusChange,
  onClick,
}) {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "DONE";
  const initials = task.assignee_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const canChangeStatus =
    task.assignee_id === userId || ["ADMIN", "MANAGER"].includes(userRole);

  const STATUS_LABEL_SHORT = {
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    BLOCKED: "Blocked",
    TODO: "To Do",
    DONE: "Done",
  };

  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="task-card" id={`task-${task.id}`} onClick={onClick}>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        <span className={`priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>
        {dueLabel && (
          <span className={`due-date ${isOverdue ? "overdue" : ""}`}>
            {isOverdue && (
              <AlertTriangle size={10} style={{ display: "inline" }} />
            )}{" "}
            {dueLabel}
          </span>
        )}
      </div>
      <div className="task-card-footer">
        {initials ? (
          <div className="assignee-avatar" title={task.assignee_name}>
            {initials}
          </div>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            Unassigned
          </span>
        )}
        {canChangeStatus && transitions.length > 0 && (
          <div
            className="task-transition-btns"
            onClick={(e) => e.stopPropagation()}
          >
            {transitions.slice(0, 2).map((s) => (
              <button
                key={s}
                className="task-transition-btn"
                onClick={() => onStatusChange(s)}
              >
                → {STATUS_LABEL_SHORT[s] || s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
