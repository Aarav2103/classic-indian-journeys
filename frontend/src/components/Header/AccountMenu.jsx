import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Single account control for the header, an avatar button that opens a
 * dropdown (name/email, Admin dashboard if admin, Logout). Replaces the
 * cluttered greeting + Admin pill + Logout pill row.
 */
const AccountMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const name = user.username.charAt(0).toUpperCase() + user.username.slice(1);
  const initial = name.charAt(0);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="inline-flex items-center gap-2 h-10 pl-1.5 pr-2.5 rounded-full border border-brand-line bg-brand-parchment/60 hover:bg-brand-parchment hover:border-brand-gold/60 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-dark flex items-center justify-center font-heading text-sm leading-none">
          {initial}
        </span>
        <span className="hidden xl:inline text-sm text-brand-ink max-w-[8rem] truncate">
          {name}
        </span>
        <i className={`ri-arrow-down-s-line text-base text-brand-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 min-w-[220px] rounded-lg bg-brand-white border border-brand-line shadow-card overflow-hidden py-1.5 z-50"
        >
          <div className="px-4 py-2.5 border-b border-brand-line/60">
            <p className="text-sm font-medium text-brand-espresso truncate">{name}</p>
            {user.email && <p className="text-xs text-brand-muted truncate">{user.email}</p>}
          </div>

          {user.role === "admin" && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-ink hover:bg-brand-cream hover:text-brand-gold-dark transition-colors"
            >
              <i className="ri-dashboard-line text-base" /> Admin dashboard
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-ink hover:bg-brand-cream transition-colors"
          >
            <i className="ri-logout-box-r-line text-base" /> Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
