import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X, FolderOpen } from "lucide-react";
import {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
} from "../api/users.api";
import { listProjects, addProjectMember } from "../api/projects.api";
import { useToast } from "../context/ToastContext";

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER",
  });
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers({ limit: 100 }).then((r) => r.data.data),
  });

  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects({ limit: 100 }).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: async (formData) => {
      // 1. Create the user
      const res = await createUser(formData);
      const newUser = res.data.data.user;

      // 2. Add to selected projects
      for (const projId of selectedProjectIds) {
        try {
          await addProjectMember(projId, {
            user_id: newUser.id,
            project_role: "MEMBER",
          });
        } catch {
          // Don't fail the whole flow if one project assignment fails
        }
      }
      return newUser;
    },
    onSuccess: (newUser) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "MEMBER" });
      setSelectedProjectIds([]);
      toast.success(`User "${newUser.name}" invited successfully!`);
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || "Failed to create user";
      setError(errMsg);
      toast.error(errMsg);
    },
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated successfully.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to deactivate user");
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ id, role }) => updateUser(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update user role");
    },
  });


  const users = data?.users || [];
  const projects = projData?.projects || [];

  const toggleProject = (projId) => {
    setSelectedProjectIds((ids) =>
      ids.includes(projId) ? ids.filter((i) => i !== projId) : [...ids, projId],
    );
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">
            {users.length} member{users.length !== 1 ? "s" : ""} in your
            organization
          </p>
        </div>
        <button
          id="invite-user-btn"
          className="btn btn-primary"
          onClick={() => {
            setError("");
            setShowCreate(true);
          }}
        >
          <UserPlus size={15} />
          Invite User
        </button>
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          padding: "2.5rem",
                        }}
                      >
                        No users found
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id} id={`user-row-${u.id}`}>
                      <td>
                        <div className="user-table-cell">
                          <div className="user-table-avatar">
                            {getInitials(u.name)}
                          </div>
                          <span className="td-primary">{u.name}</span>
                        </div>
                      </td>
                      <td className="td-secondary">{u.email}</td>
                      <td>
                        <select
                          className="role-select-inline"
                          value={u.role}
                          onChange={(e) =>
                            updateRoleMut.mutate({
                              id: u.id,
                              role: e.target.value,
                            })
                          }
                          aria-label={`Change role for ${u.name}`}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="MEMBER">Member</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${u.is_active ? "active" : "inactive"}`}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: u.is_active
                                ? "var(--success)"
                                : "var(--text-muted)",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="td-muted">
                        {new Date(u.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        {u.is_active && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              window.confirm(
                                `Deactivate ${u.name}? They will lose access to the workspace.`,
                              ) && deactivateMut.mutate(u.id)
                            }
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {showCreate && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Invite User</h2>
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
                <label className="form-label" htmlFor="invite-name">
                  Full name
                </label>
                <input
                  id="invite-name"
                  className="form-input"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-email">
                  Work email
                </label>
                <input
                  id="invite-email"
                  className="form-input"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-password">
                  Temporary password
                </label>
                <input
                  id="invite-password"
                  className="form-input"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-role">
                  Org Role
                </label>
                <select
                  id="invite-role"
                  className="form-select"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Project Assignment */}
              {projects.length > 0 && (
                <div className="form-group">
                  <label className="form-label">
                    <FolderOpen
                      size={12}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: 5,
                      }}
                    />
                    Assign to Projects
                    {selectedProjectIds.length > 0 && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: "var(--primary)",
                          fontWeight: 700,
                        }}
                      >
                        ({selectedProjectIds.length} selected)
                      </span>
                    )}
                  </label>
                  <div className="project-assign-list">
                    {projects.map((p) => (
                      <label
                        key={p.id}
                        className="project-assign-item"
                        htmlFor={`assign-proj-${p.id}`}
                      >
                        <input
                          type="checkbox"
                          id={`assign-proj-${p.id}`}
                          checked={selectedProjectIds.includes(p.id)}
                          onChange={() => toggleProject(p.id)}
                        />
                        <span className="project-assign-name">{p.name}</span>
                      </label>
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      marginTop: 5,
                    }}
                  >
                    User will be added as a Member to selected projects.
                  </p>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  id="invite-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? "Inviting…" : "Invite User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
