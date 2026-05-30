import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { accessToken } = useAuthStore();
  return (
    <Routes>
      <Route path="/login"    element={!accessToken ? <LoginPage />    : <Navigate to="/" />} />
      <Route path="/register" element={!accessToken ? <RegisterPage /> : <Navigate to="/" />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UsersPage />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
