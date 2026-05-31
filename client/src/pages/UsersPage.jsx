import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import { listUsers, createUser, updateUser, deactivateUser } from '../api/users.api';

export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers({ limit: 100 }).then(r => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'MEMBER' });
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create user'),
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ id, role }) => updateUser(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = data?.users || [];

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">
            {users.length} member{users.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
        <button
          id="invite-user-btn"
          className="btn btn-primary"
          onClick={() => { setError(''); setShowCreate(true); }}
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
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                        No users found
                      </td>
                    </tr>
                  )}
                  {users.map(u => (
                    <tr key={u.id} id={`user-row-${u.id}`}>
                      <td>
                        <div className="user-table-cell">
                          <div className="user-table-avatar">{getInitials(u.name)}</div>
                          <span className="td-primary">{u.name}</span>
                        </div>
                      </td>
                      <td className="td-secondary">{u.email}</td>
                      <td>
                        <select
                          className="role-select-inline"
                          value={u.role}
                          onChange={e => updateRoleMut.mutate({ id: u.id, role: e.target.value })}
                          aria-label={`Change role for ${u.name}`}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="MEMBER">Member</option>
                        </select>
                      </td>
                      <td>
                        <span className={`status-pill ${u.is_active ? 'active' : 'inactive'}`}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: u.is_active ? 'var(--success)' : 'var(--text-muted)',
                            display: 'inline-block', flexShrink: 0,
                          }} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="td-muted">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td>
                        {u.is_active && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              window.confirm(`Deactivate ${u.name}? They will lose access to the workspace.`) &&
                              deactivateMut.mutate(u.id)
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
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
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

            <form onSubmit={e => { e.preventDefault(); setError(''); createMut.mutate(form); }}>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-name">Full name</label>
                <input
                  id="invite-name"
                  className="form-input"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-email">Work email</label>
                <input
                  id="invite-email"
                  className="form-input"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-password">Temporary password</label>
                <input
                  id="invite-password"
                  className="form-input"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-role">Role</label>
                <select
                  id="invite-role"
                  className="form-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
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
                  id="invite-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? 'Inviting…' : 'Invite User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
