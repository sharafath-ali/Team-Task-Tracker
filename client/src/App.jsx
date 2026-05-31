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
  if (roles && !roles.includes(user?.role)) return <Navigate to="/projects" replace />;
  return children;
};

export default function App() {
  const { accessToken } = useAuthStore();
  return (
    <Routes>
      <Route path="/login"    element={!accessToken ? <LoginPage />    : <Navigate to="/projects" />} />
      <Route path="/register" element={!accessToken ? <RegisterPage /> : <Navigate to="/projects" />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Default landing → Projects */}
        <Route index element={<Navigate to="/projects" replace />} />

        {/* Projects */}
        <Route path="projects" element={<ProjectsPage />} />

        {/* Project Board (scoped to selected project via store) */}
        <Route path="board" element={<BoardPage />} />

        {/* Project Members */}
        <Route path="members" element={<ProjectMembersPage />} />

        {/* Admin — User management */}
        <Route path="users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UsersPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/projects" />} />
    </Routes>
  );
}
