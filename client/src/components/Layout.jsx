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
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✓</div>
          <span className="sidebar-logo-text">TaskTracker</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Workspace</span>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </NavLink>

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={15} />
              Users
            </NavLink>
          )}
        </nav>

        {/* Footer — user info */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <span className={`user-role-badge role-${user?.role}`}>{user?.role}</span>
            </div>
          </div>
          {user?.org_name && (
            <div className="user-org">{user.org_name}</div>
          )}
          <button className="nav-item" style={{ marginTop: 2 }} onClick={handleLogout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
