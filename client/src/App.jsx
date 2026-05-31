import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import BoardPage from './pages/BoardPage';
import UsersPage from './pages/UsersPage';
import ProjectMembersPage from './pages/ProjectMembersPage';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { accessToken } = useAuthStore();
  return (
    <Routes>
      <Route path="/login"    element={!accessToken ? <LoginPage />    : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!accessToken ? <RegisterPage /> : <Navigate to="/dashboard" />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Default → Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* ── WORKSPACE ─────────────────────────────── */}
        {/* Dashboard: task board scoped to selected project */}
        <Route path="dashboard" element={<BoardPage />} />

        {/* Dashboard sub-section: project members */}
        <Route path="dashboard/members" element={<ProjectMembersPage />} />

        {/* ── ORGANIZATION ──────────────────────────── */}
        {/* Projects listing & management */}
        <Route path="projects" element={<ProjectsPage />} />

        {/* Admin — User management */}
        <Route path="users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UsersPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
