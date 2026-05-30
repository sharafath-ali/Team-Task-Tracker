import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, CheckSquare } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { logout as logoutApi } from '../api/auth.api';

export default function Layout() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logoutApi(refreshToken); } catch {}
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✓</div>
          <span className="sidebar-logo-text">TaskTracker</span>
        </div>

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={17} />
          Dashboard
        </NavLink>

        {user?.role === 'ADMIN' && (
          <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={17} />
            Users
          </NavLink>
        )}

        <div className="sidebar-footer">
          <div className="user-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="assignee-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{initials}</div>
              <div>
                <div className="user-name">{user?.name}</div>
                <span className={`user-role role-${user?.role}`}>{user?.role}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10 }}>{user?.org_name}</div>
          </div>
          <button className="nav-item btn-ghost" onClick={handleLogout}>
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
