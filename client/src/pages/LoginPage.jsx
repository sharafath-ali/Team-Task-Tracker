import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginApi } from "../api/auth.api";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await loginApi(form);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left — Branding panel */}
      <div className="auth-panel-left">
        <div className="auth-panel-brand">
          <div className="auth-logo-icon">✓</div>
          <span className="auth-logo-text">TaskTracker</span>
        </div>

        <div className="auth-panel-content">
          <h2 className="auth-panel-title">
            Manage your team's work in one place
          </h2>
          <p className="auth-panel-subtitle">
            A focused task management platform for teams who value clarity,
            accountability, and results.
          </p>
          <ul className="auth-feature-list">
            <li>
              <span className="auth-feature-icon">✓</span>
              Role-based access — Admin, Manager, Member
            </li>
            <li>
              <span className="auth-feature-icon">✓</span>
              Kanban board with status workflows
            </li>
            <li>
              <span className="auth-feature-icon">✓</span>
              Priority tracking and due date management
            </li>
            <li>
              <span className="auth-feature-icon">✓</span>
              Project-based task organization
            </li>
          </ul>
        </div>

        <div className="auth-panel-footer">
          © 2024 TaskTracker. Built for productive teams.
        </div>
      </div>

      {/* Right — Login form */}
      <div className="auth-panel-right">
        <div className="auth-form-container">
          <h1 className="auth-title">Sign in to your account</h1>
          <p className="auth-subtitle">
            Welcome back. Enter your credentials to continue.
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <button
                id="login-submit"
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading}
                style={{ padding: "9px 18px", fontSize: "0.875rem" }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>

          <div className="auth-footer-text">
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Create organization
            </Link>
          </div>

          <div className="auth-divider" />

          <div className="demo-box">
            <strong>Demo credentials</strong>
            admin@demo.com / password123
            <br />
            manager@demo.com / password123
            <br />
            member@demo.com / password123
          </div>
        </div>
      </div>
    </div>
  );
}
