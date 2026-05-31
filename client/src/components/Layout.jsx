import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Layers,
  ChevronDown,
  Check,
  ClipboardList,
  UserCheck,
  ChevronRight,
  Building2,
} from "lucide-react";
import useAuthStore from "../store/authStore";
import useProjectStore from "../store/projectStore";
import { logout as logoutApi } from "../api/auth.api";
import { listProjects } from "../api/projects.api";

export default function Layout() {
  const { user, refreshToken, logout } = useAuthStore();
  const { selectedProject, setSelectedProject, clearSelectedProject } =
    useProjectStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const switcherRef = useRef(null);

  // Close switcher on outside click
  useEffect(() => {
    const handler = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects({ limit: 100 }).then((r) => r.data.data),
    staleTime: 30000,
  });

  const projects = projData?.projects || [];
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleLogout = async () => {
    try {
      await logoutApi(refreshToken);
    } catch {}
    logout();
    clearSelectedProject();
    navigate("/login");
  };

  const selectProject = (project) => {
    setSelectedProject(project);
    setSwitcherOpen(false);
    setSearch("");
    navigate("/dashboard");
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  const projectInitials =
    selectedProject?.name?.slice(0, 2).toUpperCase() || "··";

  // Dashboard sub-nav is active when the path starts with /dashboard
  const isDashboardActive = location.pathname.startsWith("/dashboard");

  return (
    <div className="app-layout">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          id="mobile-menu-btn"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-topbar-logo">
          <div className="sidebar-logo-icon">✓</div>
          <span className="sidebar-logo-text">TaskTracker</span>
        </div>
      </div>

      {/* Overlay backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}>
        {/* Close button (mobile only) */}
        <button
          className="sidebar-close-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
          id="sidebar-close-btn"
        >
          ✕
        </button>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✓</div>
          <span className="sidebar-logo-text">TaskTracker</span>
        </div>

        {/* Project Switcher */}
        <div className="project-switcher" ref={switcherRef}>
          <button
            className="project-switcher-btn"
            onClick={() => {
              setSwitcherOpen((o) => !o);
              setSearch("");
            }}
            id="project-switcher-btn"
            aria-expanded={switcherOpen}
            aria-label="Switch project"
          >
            <div className="project-switcher-icon">{projectInitials}</div>
            <div className="project-switcher-text">
              <div className="project-switcher-label">Current Project</div>
              <div
                className={`project-switcher-name${!selectedProject ? " no-project" : ""}`}
              >
                {selectedProject?.name || "None selected"}
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`switcher-chevron${switcherOpen ? " open" : ""}`}
            />
          </button>

          {switcherOpen && (
            <div className="project-switcher-dropdown">
              <div className="switcher-search">
                <input
                  autoFocus
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search projects"
                />
              </div>
              <div className="switcher-list">
                {filtered.length === 0 && (
                  <div
                    style={{
                      padding: "12px 10px",
                      fontSize: "0.78rem",
                      color: "var(--sidebar-text-muted)",
                      textAlign: "center",
                    }}
                  >
                    No projects found
                  </div>
                )}
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    className={`switcher-item${selectedProject?.id === p.id ? " active" : ""}`}
                    onClick={() => selectProject(p)}
                    id={`switcher-project-${p.id}`}
                  >
                    <div className="switcher-item-icon">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="switcher-item-name">{p.name}</span>
                    {selectedProject?.id === p.id && (
                      <Check size={13} className="switcher-item-check" />
                    )}
                  </button>
                ))}
              </div>
              <div className="switcher-footer">
                <button
                  className="switcher-all-btn"
                  onClick={() => {
                    setSwitcherOpen(false);
                    navigate("/projects");
                  }}
                >
                  <Layers size={13} />
                  Manage All Projects
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────── */}
        <nav className="sidebar-nav">
          {/* WORKSPACE section */}
          <span className="sidebar-section-label">Workspace</span>

          {/* Dashboard — top-level link */}
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            id="nav-dashboard"
          >
            <LayoutDashboard size={15} />
            Dashboard
          </NavLink>

          {/* Dashboard sub-nav — shown when a project is selected AND we're inside /dashboard */}
          {selectedProject && isDashboardActive && (
            <div className="sidebar-subnav">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `nav-item nav-item-sub ${isActive ? "active" : ""}`
                }
                id="nav-tasks"
              >
                <ClipboardList size={13} />
                Tasks
              </NavLink>
              <NavLink
                to="/dashboard/members"
                className={({ isActive }) =>
                  `nav-item nav-item-sub ${isActive ? "active" : ""}`
                }
                id="nav-members"
              >
                <UserCheck size={13} />
                Members
              </NavLink>
            </div>
          )}

          {/* ORGANIZATION section */}
          <span className="sidebar-section-label" style={{ marginTop: 12 }}>
            Organization
          </span>

          <NavLink
            to="/projects"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            id="nav-projects"
          >
            <Layers size={15} />
            Projects
          </NavLink>

          {user?.role === "ADMIN" && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              id="nav-users"
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
              <span className={`user-role-badge role-${user?.role}`}>
                {user?.role}
              </span>
            </div>
          </div>
          {user?.org_name && <div className="user-org">{user.org_name}</div>}
          <button
            className="nav-item"
            style={{ marginTop: 2 }}
            onClick={handleLogout}
          >
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
