import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UserPlus, X, Layers, ArrowRight, Trash2 } from "lucide-react";
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
} from "../api/projects.api";
import { listUsers } from "../api/users.api";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";

export default function ProjectMembersPage() {
  const { user } = useAuthStore();
  const { selectedProject } = useProjectStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    user_id: "",
    project_role: "MEMBER",
  });
  const [error, setError] = useState("");

  const isAdmin = user?.role === "ADMIN";

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["project-members", selectedProject?.id],
    enabled: !!selectedProject,
    queryFn: () =>
      getProjectMembers(selectedProject.id).then((r) => r.data.data.members),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    enabled: isAdmin && !!selectedProject,
    queryFn: () => listUsers({ limit: 100 }).then((r) => r.data.data),
  });

  const addMut = useMutation({
    mutationFn: () => addProjectMember(selectedProject.id, addForm),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["project-members", selectedProject.id],
      });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowAdd(false);
      setAddForm({ user_id: "", project_role: "MEMBER" });
    },
    onError: (err) =>
      setError(err.response?.data?.message || "Failed to add member"),
  });

  const removeMut = useMutation({
    mutationFn: (userId) => removeProjectMember(selectedProject.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["project-members", selectedProject.id],
      });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ userId, project_role }) =>
      updateProjectMember(selectedProject.id, userId, { project_role }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["project-members", selectedProject.id],
      }),
  });

  const members = membersData || [];
  const allUsers = usersData?.users || [];
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = allUsers.filter(
    (u) => !memberUserIds.has(u.id) && u.is_active,
  );

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  if (!selectedProject) {
    return (
      <div className="board-no-project">
        <div className="board-no-project-icon">
          <Layers size={36} />
        </div>
        <div>
          <div className="empty-state-title">No project selected</div>
          <p className="empty-state-desc">
            Select a project from the switcher to manage its members.
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
      {/* Header */}
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
            <h1 className="page-title">Members</h1>
            <span className="project-scope-badge">{selectedProject.name}</span>
          </div>
          <p className="page-subtitle">
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            project
          </p>
        </div>
        {isAdmin && (
          <button
            id="add-member-btn"
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setShowAdd(true);
            }}
          >
            <UserPlus size={15} />
            Add Member
          </button>
        )}
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No members yet</div>
            <p className="empty-state-desc">
              {isAdmin
                ? "Add members to this project to collaborate."
                : "No members have been added to this project."}
            </p>
          </div>
        ) : (
          <div className="members-grid">
            {members.map((m) => (
              <div
                key={m.id}
                id={`member-${m.user_id}`}
                className="member-card"
              >
                <div className="member-card-avatar">
                  {getInitials(m.user_name)}
                </div>
                <div className="member-card-info">
                  <div className="member-card-name">{m.user_name}</div>
                  <div className="member-card-email">{m.user_email}</div>
                  <div className="member-card-badges">
                    <span className={`user-role-badge role-${m.org_role}`}>
                      {m.org_role}
                    </span>
                    {isAdmin ? (
                      <select
                        className="role-select-inline"
                        value={m.project_role}
                        onChange={(e) =>
                          updateRoleMut.mutate({
                            userId: m.user_id,
                            project_role: e.target.value,
                          })
                        }
                        aria-label={`Project role for ${m.user_name}`}
                      >
                        <option value="OWNER">Owner</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    ) : (
                      <span
                        className={`project-role-badge project-role-${m.project_role}`}
                      >
                        {m.project_role}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && m.user_id !== user?.id && (
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    title="Remove from project"
                    onClick={() =>
                      window.confirm(
                        `Remove ${m.user_name} from ${selectedProject.name}?`,
                      ) && removeMut.mutate(m.user_id)
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAdd && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Member</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowAdd(false)}
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
                addMut.mutate();
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="add-member-user">
                  User *
                </label>
                <select
                  id="add-member-user"
                  className="form-select"
                  value={addForm.user_id}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, user_id: e.target.value }))
                  }
                  required
                >
                  <option value="">Select a user…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginTop: 6,
                    }}
                  >
                    All org members are already in this project.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="add-member-role">
                  Project Role
                </label>
                <select
                  id="add-member-role"
                  className="form-select"
                  value={addForm.project_role}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, project_role: e.target.value }))
                  }
                >
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button
                  id="add-member-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={addMut.isPending || !addForm.user_id}
                >
                  {addMut.isPending ? "Adding…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
