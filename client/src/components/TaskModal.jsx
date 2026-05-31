import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createTask } from "../api/tasks.api";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";
import { useToast } from "../context/ToastContext";

export default function TaskModal({ users = [], onClose, onSaved }) {
  const { user } = useAuthStore();
  const { selectedProject } = useProjectStore();
  const toast = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assignee_id: "",
    project_id: selectedProject?.id || "",
    due_date: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProject?.id) {
      setForm((f) => ({ ...f, project_id: selectedProject.id }));
    }
  }, [selectedProject]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createTask({
        ...form,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
      });
      toast.success(`Task "${form.title}" created successfully!`);
      onSaved();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to create task";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Create Task</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Project chip */}
        <div className="modal-meta-row">
          <span className="modal-meta-chip">
            Project: <strong>{selectedProject?.name || "No project"}</strong>
          </span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Title *</label>
            <input
              id="task-title"
              className="form-input"
              value={form.title}
              onChange={set("title")}
              required
              placeholder="Enter task title"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="form-textarea"
              value={form.description}
              onChange={set("description")}
              placeholder="Add a description (optional)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                className="form-select"
                value={form.priority}
                onChange={set("priority")}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-due-date">Due Date</label>
              <input
                id="task-due-date"
                className="form-input"
                type="date"
                value={form.due_date}
                onChange={set("due_date")}
              />
            </div>
          </div>

          {["ADMIN", "MANAGER"].includes(user?.role) && (
            <div className="form-group">
              <label className="form-label" htmlFor="task-assignee">Assignee</label>
              <select
                id="task-assignee"
                className="form-select"
                value={form.assignee_id}
                onChange={set("assignee_id")}
              >
                <option value="">Unassigned</option>
                {users.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              id="task-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
