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
} from "lucide-react";
import { listProjects, createProject } from "../api/projects.api";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";

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

  const [showCreate, setShowCreate] = useState(false);
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
      navigate("/board");
    },
    onError: (err) =>
      setError(err.response?.data?.message || "Failed to create project"),
  });

  const projects = data?.projects || [];
  const canCreate = ["ADMIN", "MANAGER"].includes(user?.role);

  const openProject = (project) => {
    setSelectedProject(project);
    navigate("/board");
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
                    <div>
                      <div className="project-card-name">{project.name}</div>
                      <div className="project-card-desc">
                        {project.description || "No description provided."}
                      </div>
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
    </>
  );
}
