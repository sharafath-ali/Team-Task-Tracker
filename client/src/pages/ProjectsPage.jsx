import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  X,
  FolderOpen,
  Users,
  CheckSquare,
  Clock,
  Layers,
  Edit,
} from "lucide-react";
import { listProjects, createProject, updateProject } from "../api/projects.api";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";
import { useToast } from "../context/ToastContext";

const ACCENT_COLORS = [
  "color-1",
  "color-2",
  "color-3",
  "color-4",
  "color-5",
  "color-0",
];

function timeAgo(dateStr) {
  if (!dateStr) return "No activity";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const { selectedProject, setSelectedProject } = useProjectStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects({ limit: 100 }).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: createProject,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      const proj = res.data.data.project;
      setSelectedProject(proj);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      toast.success(`Project "${proj.name}" created successfully!`);
      navigate("/dashboard");
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || "Failed to create project";
      setError(errMsg);
      toast.error(errMsg);
    },
  });


  const projects = data?.projects || [];
  const canCreate = ["ADMIN", "MANAGER"].includes(user?.role);

  const openProject = (project) => {
    setSelectedProject(project);
    navigate("/dashboard");
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {user?.org_name} ·{" "}
            {user?.role === "ADMIN"
              ? `${projects.length} project${projects.length !== 1 ? "s" : ""} in organization`
              : `${projects.length} project${projects.length !== 1 ? "s" : ""} you have access to`}
          </p>
        </div>
        {canCreate && (
          <button
            id="create-project-btn"
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setShowCreate(true);
            }}
          >
            <Plus size={15} />
            New Project
          </button>
        )}
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Layers size={32} />
            </div>
            <div className="empty-state-title">No projects yet</div>
            <p className="empty-state-desc">
              {canCreate
                ? "Create your first project to get started organizing tasks for your team."
                : "You have not been assigned to any projects yet. Ask your admin to add you."}
            </p>
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setError("");
                  setShowCreate(true);
                }}
              >
                <Plus size={15} />
                Create First Project
              </button>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project, idx) => {
              const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];
              const total = project.total_task_count || 0;
              const open = project.open_task_count || 0;
              const done = total - open;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isActive = selectedProject?.id === project.id;

              return (
                <div
                  key={project.id}
                  id={`project-card-${project.id}`}
                  className={`project-card${isActive ? " active" : ""}`}
                  onClick={() => openProject(project)}
                  style={
                    isActive
                      ? {
                          borderColor: "var(--primary-border)",
                          boxShadow: "0 0 0 2px rgba(37,99,235,0.15)",
                        }
                      : {}
                  }
                >
                  <div className={`project-card-accent ${accent}`} />
                  <div className="project-card-body">
                    {/* Name + description */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="project-card-name">{project.name}</div>
                        <div className="project-card-desc">
                          {project.description || "No description provided."}
                        </div>
                      </div>
                      {["ADMIN", "MANAGER"].includes(user?.role) && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm project-edit-btn"
                          title="Edit Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                          }}
                        >
                          <Edit size={14} />
                        </button>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="project-card-stats">
                      <div className="project-stat-item">
                        <span className="project-stat-label">Open Tasks</span>
                        <span
                          className={`project-stat-value${open > 0 ? " value-open" : ""}`}
                        >
                          {open}
                        </span>
                      </div>
                      <div className="project-stat-item">
                        <span className="project-stat-label">Members</span>
                        <span className="project-stat-value">
                          {project.member_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="progress-wrap">
                      <div className="progress-label">
                        <span className="progress-text">Progress</span>
                        <span className="progress-pct">{pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill${pct === 100 ? " full" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="project-card-footer">
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Users size={12} style={{ color: "var(--text-muted)" }} />
                      <span className="member-count-label">
                        {project.member_count || 0} member
                        {project.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="activity-label">
                      <Clock
                        size={11}
                        style={{
                          display: "inline",
                          verticalAlign: "middle",
                          marginRight: 3,
                        }}
                      />
                      {timeAgo(project.last_activity)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                createMut.mutate(form);
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="project-name">
                  Project name *
                </label>
                <input
                  id="project-name"
                  className="form-input"
                  placeholder="e.g. Q4 Product Launch"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="project-desc">
                  Description
                </label>
                <textarea
                  id="project-desc"
                  className="form-textarea"
                  placeholder="What is this project about? (optional)"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  id="create-project-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </>
  );
}

// ─── Edit Project Modal Component ────────────────────────────────────
function EditProjectModal({ project, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || "",
  });
  const [error, setError] = useState("");

  const updateMut = useMutation({
    mutationFn: (data) => updateProject(project.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Project "${form.name}" updated successfully!`);
      onClose();
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || "Failed to update project";
      setError(errMsg);
      toast.error(errMsg);
    },
  });

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Project</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            updateMut.mutate(form);
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="edit-project-name">
              Project name *
            </label>
            <input
              id="edit-project-name"
              className="form-input"
              placeholder="e.g. Q4 Product Launch"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-project-desc">
              Description
            </label>
            <textarea
              id="edit-project-desc"
              className="form-textarea"
              placeholder="What is this project about? (optional)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              id="edit-project-submit"
              type="submit"
              className="btn btn-primary"
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
