import React, { useContext, useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import RequireAdmin from "./RequireAdmin";

const NAV = [
  { to: "/admin", end: true, label: "Dashboard", icon: "ri-dashboard-line" },
  { to: "/admin/tours", label: "Journeys", icon: "ri-map-2-line" },
  { to: "/admin/knowledge", label: "Knowledge", icon: "ri-file-copy-line" },
  { to: "/admin/bookings", label: "Bookings", icon: "ri-calendar-check-line" },
  { to: "/admin/enquiries", label: "Enquiries", icon: "ri-mail-line" },
  { to: "/admin/users", label: "Users", icon: "ri-group-line" },
  { to: "/admin/moderation", label: "Moderation", icon: "ri-chat-check-line" },
  { to: "/admin/trash", label: "Trash", icon: "ri-delete-bin-line" },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-gold/15 text-brand-gold-dark"
      : "text-brand-on-deep/80 hover:bg-brand-on-deep/10 hover:text-brand-on-deep"
  }`;

const NavItems = ({ onNavigate }) =>
  NAV.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={linkClass}
    >
      <i className={`${item.icon} text-lg`} />
      {item.label}
    </NavLink>
  ));

const AdminLayout = () => {
  const { user, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/");
  };
  const initial = (user?.username || "?").charAt(0).toUpperCase();

  return (
    <RequireAdmin>
      {/* Fixed-height shell: the page itself never scrolls, only <main> does,
          so the sidebar and topbar stay put. */}
      <div className="h-screen overflow-hidden bg-brand-cream flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-brand-deep text-brand-on-deep h-screen">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-brand-on-deep/10"
          >
            <img src="/logo-final.webp" alt="" className="h-9 w-auto" />
            <span className="font-heading text-base leading-tight">CIJ Admin</span>
          </Link>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <NavItems />
          </nav>
          <Link
            to="/"
            className="flex items-center gap-3 mx-4 mb-4 px-4 py-2.5 rounded-lg text-sm text-brand-on-deep/70 hover:text-brand-on-deep hover:bg-brand-on-deep/10 transition-colors"
          >
            <i className="ri-external-link-line text-lg" /> View live site
          </Link>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col h-screen">
          {/* Topbar */}
          <header className="relative shrink-0 bg-brand-parchment border-b border-brand-line">
            <div className="flex items-center gap-4 px-4 md:px-8 h-16">
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-brand-line text-brand-espresso"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <i className={`text-xl ${mobileOpen ? "ri-close-line" : "ri-menu-line"}`} />
              </button>
              <span className="lg:hidden font-heading text-brand-espresso">CIJ Admin</span>

              <div className="flex items-center gap-3 sm:gap-5 ml-auto">
                <div className="hidden sm:flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-brand-gold/15 text-brand-gold-dark flex items-center justify-center font-heading text-sm">
                    {initial}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm text-brand-ink font-medium">
                      {user?.username}
                    </span>
                    <span className="block text-xs text-brand-muted">Administrator</span>
                  </span>
                </div>
                <span className="hidden sm:block h-8 w-px bg-brand-line" />
                <button onClick={logout} className="ds-btn ds-btn-ghost ds-btn-sm">
                  <i className="ri-logout-box-r-line" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile nav drawer (overlays content) */}
            {mobileOpen && (
              <nav className="lg:hidden absolute top-full left-0 right-0 bg-brand-deep text-brand-on-deep px-4 py-4 space-y-1 max-h-[75vh] overflow-y-auto shadow-xl z-40">
                <NavItems onNavigate={() => setMobileOpen(false)} />
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-brand-on-deep/70"
                >
                  <i className="ri-external-link-line text-lg" /> View live site
                </Link>
              </nav>
            )}
          </header>

          {/* The only scrolling region */}
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 md:px-8 py-8 w-full max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
};

export default AdminLayout;
