import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Filter,
  AlertTriangle,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { listTasks, updateStatus } from "../api/tasks.api";
import { listUsers } from "../api/users.api";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";
import TaskModal from "../components/TaskModal";
import { useToast } from "../context/ToastContext";


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

function getPageNumbers(current, total) {
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (current > 3) {
      pages.push("...");
    }
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (current < total - 2) {
      pages.push("...");
    }
    if (!pages.includes(total)) pages.push(total);
  }
  return pages;
}

export default function BoardPage() {
  const { user } = useAuthStore();
  const { selectedProject } = useProjectStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState({ priority: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Reset page when project or filters change
  useEffect(() => {
    setPage(1);
  }, [selectedProject?.id, filters]);

  // Scope tasks to the selected project
  const taskQueryKey = ["tasks", selectedProject?.id, filters, page, limit];
  const { data, isLoading } = useQuery({
    queryKey: taskQueryKey,
    enabled: !!selectedProject,
    queryFn: () => {
      // Strip empty-string / falsy filter values so they're never sent as query params
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null),
      );
      return listTasks({
        project_id: selectedProject.id,
        ...cleanFilters,
        page,
        limit,
      }).then((r) => r.data.data);
    },
  });

  // Fetch org users for task assignment
  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    enabled: ["ADMIN", "MANAGER"].includes(user?.role),
    queryFn: () => listUsers({ limit: 100 }).then((r) => r.data.data),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      // Format the status key for displaying (e.g. IN_PROGRESS -> In Progress)
      const label = COLUMNS.find((c) => c.key === variables.status)?.label || variables.status;
      toast.success(`Task status updated to "${label}"`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update task status");
    },
  });


  const tasks = data?.tasks || [];
  const allUsers = usersData?.users || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  const total = pagination.total || 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const overdue = tasks.filter(
    (t) =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== "DONE",
  ).length;
  const high = tasks.filter(
    (t) => t.priority === "HIGH" && t.status !== "DONE",
  ).length;

  const canCreate = ["ADMIN", "MANAGER"].includes(user?.role);
  const hasFilters = !!filters.priority;

  // No project selected — show prompt
  if (!selectedProject) {
    return (
      <div className="board-no-project">
        <div className="board-no-project-icon">
          <Layers size={36} />
        </div>
        <div>
          <div className="empty-state-title">No project selected</div>
          <p className="empty-state-desc">
            Select a project from the sidebar switcher or browse your projects
            first.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/projects")}
        >
          <ArrowRight size={15} />
          Browse Projects
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <h1 className="page-title">Board</h1>
            <span className="project-scope-badge">{selectedProject.name}</span>
          </div>
          <p className="page-subtitle">
            {user?.role === "MEMBER"
              ? "Showing tasks assigned to you"
              : `${total} task${total !== 1 ? "s" : ""}`}
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

        {/* Filters — only priority now, project is from store */}
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
          {hasFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters({ priority: "" })}
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
          <>
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
                    <div className="empty-column">
                      <div className="empty-column-icon">○</div>
                      No tasks
                    </div>
                  ) : (
                    tasksByStatus[col.key].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        userRole={user?.role}
                        userId={user?.id}
                        transitions={TRANSITIONS[task.status] || []}
                        onStatusChange={(status) =>
                          statusMut.mutate({ id: task.id, status })
                        }
                        onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {total > 0 && (
              <div className="board-pagination">
                <div className="pagination-info">
                  Showing <span className="pagination-bold">{Math.min((page - 1) * limit + 1, total)}</span>–
                  <span className="pagination-bold">{Math.min(page * limit, total)}</span> of{" "}
                  <span className="pagination-bold">{total}</span> tasks
                </div>

                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    title="First Page"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="pagination-pages">
                    {getPageNumbers(page, pagination.totalPages).map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          className={`pagination-btn page-num-btn${page === p ? " active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                    disabled={page === pagination.totalPages}
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setPage(pagination.totalPages)}
                    disabled={page === pagination.totalPages}
                    title="Last Page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>

                <div className="pagination-size">
                  <span className="pagination-size-label">Per page:</span>
                  <select
                    className="form-select pagination-select"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <TaskModal
          users={allUsers}
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

// ─── Task Card ─────────────────────────────────────────────────────
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
