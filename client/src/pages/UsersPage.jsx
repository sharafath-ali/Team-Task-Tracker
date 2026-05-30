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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setForm({ name: '', email: '', password: '', role: 'MEMBER' }); },
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage organization members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> Invite User
        </button>
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <select
                        className="form-select"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                        value={u.role}
                        onChange={e => updateRoleMut.mutate({ id: u.id, role: e.target.value })}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                        background: u.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                        color: u.is_active ? '#22c55e' : 'var(--text-muted)',
                      }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {u.is_active && (
                        <button className="btn btn-danger btn-sm"
                          onClick={() => window.confirm('Deactivate this user?') && deactivateMut.mutate(u.id)}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Invite User</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={e => { e.preventDefault(); setError(''); createMut.mutate(form); }}>
              <div className="form-group"><label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Temporary Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required minLength={8} /></div>
              <div className="form-group"><label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                  <option value="MEMBER">MEMBER</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Inviting...' : 'Invite User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
