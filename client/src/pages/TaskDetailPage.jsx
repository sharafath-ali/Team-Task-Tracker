import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Calendar,
  User,
  Flag,
  FolderOpen,
  Clock,
  AlertTriangle,
  Trash2,
  ChevronRight,
} from "lucide-react";
import {
  getTask,
  updateTask,
  updateStatus,
  deleteTask,
} from "../api/tasks.api";
import { listUsers } from "../api/users.api";
import useAuthStore from "../store/authStore";

// ─── Constants ─────────────────────────────────────────────────────
const STATUS_DISPLAY = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

const STATUS_COLOR = {
  TODO: "#64748b",
  IN_PROGRESS: "#2563eb",
  IN_REVIEW: "#d97706",
  DONE: "#16a34a",
  BLOCKED: "#dc2626",
};

const PRIORITY_STYLES = {
  LOW: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
  MEDIUM: { bg: "#fef9c3", color: "#a16207", border: "#fef08a" },
  HIGH: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
};

const TRANSITIONS = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  BLOCKED: ["TODO", "IN_PROGRESS"],
  DONE: [],
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ──────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Fetch task
  const {
    data: taskData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId).then((r) => r.data.data.task),
    staleTime: 30_000,
  });

  const task = taskData;

  // Fetch users for assignee dropdown (admin/manager only)
  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    enabled: ["ADMIN", "MANAGER"].includes(user?.role),
    queryFn: () => listUsers({ limit: 100 }).then((r) => r.data.data),
  });
  const allUsers = usersData?.users || [];

  // Sync form when task loads or edit mode toggled
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        assignee_id: task.assignee_id || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
      });
    }
  }, [task]);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: (payload) => updateTask(taskId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setEditMode(false);
      setSaveError("");
    },
    onError: (err) =>
      setSaveError(err.response?.data?.message || "Failed to save"),
  });

  // Status transition mutation
  const statusMut = useMutation({
    mutationFn: (status) => updateStatus(taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      navigate(-1);
    },
    onError: (err) =>
      setSaveError(err.response?.data?.message || "Failed to delete"),
  });

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = () => {
    saveMut.mutate({
      ...form,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
    });
  };

  const handleCancelEdit = () => {
    // reset form to current task values
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        assignee_id: task.assignee_id || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
      });
    }
    setEditMode(false);
    setSaveError("");
  };

  const canEdit =
    task &&
    (["ADMIN", "MANAGER"].includes(user?.role) ||
      task.assignee_id === user?.id);
  const canDelete = ["ADMIN", "MANAGER"].includes(user?.role);

  const isOverdue =
    task?.due_date &&
    new Date(task.due_date) < new Date() &&
    task?.status !== "DONE";

  const transitions = task ? TRANSITIONS[task.status] || [] : [];
  const canTransition =
    task &&
    (task.assignee_id === user?.id ||
      ["ADMIN", "MANAGER"].includes(user?.role));

  // ── Loading / Error ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="loading-center" style={{ height: "100%" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="td-page">
        <div className="td-topbar">
          <button
            className="btn btn-ghost btn-sm td-back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-state-title">Task not found</div>
          <p className="empty-state-desc">
            This task may have been deleted or you don't have access.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="td-page">
      {/* ── Top Bar ── */}
      <div className="td-topbar">
        <div className="td-breadcrumb">
          <button
            className="btn btn-ghost btn-sm td-back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <ChevronRight size={13} className="td-breadcrumb-sep" />
          <FolderOpen size={13} />
          <span>{task.project_name}</span>
          <ChevronRight size={13} className="td-breadcrumb-sep" />
          <span className="td-breadcrumb-task">{task.title}</span>
        </div>

        <div className="td-topbar-actions">
          {/* Status transition quick buttons */}
          {canTransition && transitions.length > 0 && (
            <div className="td-transitions">
              {transitions.map((s) => (
                <button
                  key={s}
                  className="btn btn-secondary btn-sm"
                  disabled={statusMut.isPending}
                  onClick={() => statusMut.mutate(s)}
                  style={{
                    borderColor: STATUS_COLOR[s] + "66",
                    color: STATUS_COLOR[s],
                  }}
                >
                  → {STATUS_DISPLAY[s]}
                </button>
              ))}
            </div>
          )}

          {canEdit && !editMode && (
            <button
              id="task-edit-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditMode(true)}
            >
              <Pencil size={13} /> Edit
            </button>
          )}

          {editMode && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCancelEdit}
              >
                <X size={13} /> Cancel
              </button>
              <button
                id="task-save-btn"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saveMut.isPending}
              >
                <Check size={13} />
                {saveMut.isPending ? "Saving…" : "Save Changes"}
              </button>
            </>
          )}

          {canDelete && (
            <button
              id="task-delete-btn"
              className={`btn btn-sm ${deleteConfirm ? "btn-danger" : "btn-ghost"}`}
              onClick={() => {
                if (!deleteConfirm) {
                  setDeleteConfirm(true);
                  return;
                }
                deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
            >
              <Trash2 size={13} />
              {deleteConfirm ? "Confirm?" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="td-body">
        {/* ── LEFT: main content ── */}
        <div className="td-main">
          {/* Status + overdue */}
          <div className="td-status-row">
            <span
              className="td-status-badge"
              style={{
                background: STATUS_COLOR[task.status] + "1a",
                color: STATUS_COLOR[task.status],
                border: `1px solid ${STATUS_COLOR[task.status]}44`,
              }}
            >
              <span
                className="td-status-dot"
                style={{ background: STATUS_COLOR[task.status] }}
              />
              {STATUS_DISPLAY[task.status]}
            </span>
            {isOverdue && (
              <span className="td-overdue-badge">
                <AlertTriangle size={11} /> Overdue
              </span>
            )}
          </div>

          {/* Title */}
          <div className="td-title-block">
            {editMode ? (
              <input
                id="task-title"
                className="form-input td-title-input"
                value={form.title}
                onChange={set("title")}
                required
                placeholder="Task title"
              />
            ) : (
              <h1 className="td-title">{task.title}</h1>
            )}
          </div>

          {/* Description */}
          <div className="td-section">
            <div className="td-section-label">Description</div>
            {editMode ? (
              <textarea
                id="task-description"
                className="form-textarea td-desc-textarea"
                value={form.description}
                onChange={set("description")}
                placeholder="Add a description…"
              />
            ) : (
              <div className="td-desc-view">
                {task.description || (
                  <span
                    style={{ color: "var(--text-muted)", fontStyle: "italic" }}
                  >
                    No description provided.
                  </span>
                )}
              </div>
            )}
          </div>

          {saveError && <div className="alert alert-error">{saveError}</div>}
        </div>

        {/* ── RIGHT: details sidebar ── */}
        <div className="td-sidebar">
          <div className="td-sidebar-heading">Details</div>

          {/* Priority */}
          <div className="td-detail-row">
            <div className="td-detail-label">
              <Flag size={12} /> Priority
            </div>
            {editMode ? (
              <select
                id="task-priority"
                className="form-select td-detail-select"
                value={form.priority}
                onChange={set("priority")}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            ) : (
              <span
                className="td-priority-chip"
                style={{
                  background: PRIORITY_STYLES[task.priority]?.bg,
                  color: PRIORITY_STYLES[task.priority]?.color,
                  border: `1px solid ${PRIORITY_STYLES[task.priority]?.border}`,
                }}
              >
                {task.priority}
              </span>
            )}
          </div>

          {/* Assignee */}
          <div className="td-detail-row">
            <div className="td-detail-label">
              <User size={12} /> Assignee
            </div>
            {editMode && ["ADMIN", "MANAGER"].includes(user?.role) ? (
              <select
                id="task-assignee"
                className="form-select td-detail-select"
                value={form.assignee_id}
                onChange={set("assignee_id")}
              >
                <option value="">Unassigned</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="td-person-row">
                {task.assignee_name ? (
                  <>
                    <div className="td-avatar">
                      {task.assignee_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <span className="td-detail-value">
                      {task.assignee_name}
                    </span>
                  </>
                ) : (
                  <span className="td-detail-value td-muted">Unassigned</span>
                )}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="td-detail-row">
            <div className="td-detail-label">
              <Calendar size={12} /> Due Date
            </div>
            {editMode ? (
              <input
                id="task-due-date"
                className="form-input td-detail-select"
                type="date"
                value={form.due_date}
                onChange={set("due_date")}
              />
            ) : (
              <span
                className="td-detail-value"
                style={
                  isOverdue ? { color: "var(--danger)", fontWeight: 600 } : {}
                }
              >
                {isOverdue && (
                  <AlertTriangle
                    size={11}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                )}
                {formatDate(task.due_date) || (
                  <span className="td-muted">No due date</span>
                )}
              </span>
            )}
          </div>

          {/* Creator */}
          {task.creator_name && (
            <div className="td-detail-row">
              <div className="td-detail-label">
                <User size={12} /> Created by
              </div>
              <div className="td-person-row">
                <div className="td-avatar td-avatar-purple">
                  {task.creator_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <span className="td-detail-value">{task.creator_name}</span>
              </div>
            </div>
          )}

          {/* Created at */}
          {task.created_at && (
            <div className="td-detail-row">
              <div className="td-detail-label">
                <Clock size={12} /> Created
              </div>
              <span className="td-detail-value">
                {formatDateTime(task.created_at)}
              </span>
            </div>
          )}

          {/* Updated at */}
          {task.updated_at && (
            <div className="td-detail-row">
              <div className="td-detail-label">
                <Clock size={12} /> Updated
              </div>
              <span className="td-detail-value">
                {formatDateTime(task.updated_at)}
              </span>
            </div>
          )}

          {/* Completed at */}
          {task.completed_at && (
            <div className="td-detail-row">
              <div className="td-detail-label">
                <Check size={12} /> Completed
              </div>
              <span
                className="td-detail-value"
                style={{ color: "var(--success)" }}
              >
                {formatDateTime(task.completed_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
