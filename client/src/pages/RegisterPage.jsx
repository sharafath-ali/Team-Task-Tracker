import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as registerApi } from "../api/auth.api";
import useAuthStore from "../store/authStore";

export default function RegisterPage() {
  const [form, setForm] = useState({
    orgName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerApi(form);
      // Auto-login after register
      const { login } = await import("../api/auth.api");
      const { data } = await login({
        email: form.email,
        password: form.password,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="auth-page">
      {/* Left — Branding panel */}
      <div className="auth-panel-left">
        <div className="auth-panel-brand">
          <div className="auth-logo-icon">✓</div>
          <span className="auth-logo-text">TaskTracker</span>
        </div>

        <div className="auth-panel-content">
          <h2 className="auth-panel-title">Set up your team's workspace</h2>
          <p className="auth-panel-subtitle">
            Create your organization and start managing tasks with your team.
            You'll be the Admin with full control.
          </p>
          <ul className="auth-feature-list">
            <li>
              <span className="auth-feature-icon">✓</span>
              Invite unlimited team members
            </li>
            <li>
              <span className="auth-feature-icon">✓</span>
              Create projects and assign tasks
            </li>
            <li>
              <span className="auth-feature-icon">✓</span>
              Control access with role permissions
            </li>
            <li>
              <span className="auth-feature-icon">✓</span>
              Track progress across your whole team
            </li>
          </ul>
        </div>

        <div className="auth-panel-footer">
          © 2024 TaskTracker. Built for productive teams.
        </div>
      </div>

      {/* Right — Register form */}
      <div className="auth-panel-right">
        <div className="auth-form-container">
          <h1 className="auth-title">Create your workspace</h1>
          <p className="auth-subtitle">
            You'll be the Admin of your organization.
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-org">
                Organization name
              </label>
              <input
                id="reg-org"
                className="form-input"
                placeholder="Acme Corp"
                value={form.orgName}
                onChange={set("orgName")}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">
                Your full name
              </label>
              <input
                id="reg-name"
                className="form-input"
                placeholder="Alice Smith"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">
                Work email
              </label>
              <input
                id="reg-email"
                className="form-input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={set("email")}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                className="form-input"
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <button
                id="register-submit"
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading}
                style={{ padding: "9px 18px", fontSize: "0.875rem" }}
              >
                {loading ? "Creating workspace…" : "Create Workspace"}
              </button>
            </div>
          </form>

          <div className="auth-footer-text">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
