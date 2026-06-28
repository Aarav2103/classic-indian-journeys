import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { Input } from "../../ui/Input";
import Button from "../../ui/Button";
import Alert from "../../ui/Alert";

const ChangePasswordModal = ({ userId, onClose }) => {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.next.length < 6) {
      setStatus({ type: "error", msg: "New password must be at least 6 characters." });
      return;
    }
    if (form.next !== form.confirm) {
      setStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await api.put(`/users/${userId}/password`, {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setStatus({ type: "success", msg: "Password updated." });
      setTimeout(onClose, 1000);
    } catch (err) {
      setStatus({
        type: "error",
        msg: err?.response?.data?.message || "Failed to update password.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
    >
      <div className="absolute inset-0 bg-brand-espresso/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-lg bg-brand-white border border-brand-line shadow-card p-6 space-y-4"
      >
        <h2 className="font-heading text-lg text-brand-espresso">Change password</h2>
        <Input
          label="Current password"
          name="current"
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={onChange}
          required
        />
        <Input
          label="New password"
          name="next"
          type="password"
          autoComplete="new-password"
          value={form.next}
          onChange={onChange}
          required
        />
        <Input
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={onChange}
          required
        />
        {status && (
          <Alert
            tone={status.type === "success" ? "success" : "error"}
            onClose={() => setStatus(null)}
          >
            {status.msg}
          </Alert>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
};

/**
 * Single account control for the header, an avatar button that opens a
 * dropdown (name/email, Admin dashboard if admin, Change password, Logout).
 */
const AccountMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
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
              setChangingPassword(true);
            }}
            className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-ink hover:bg-brand-cream transition-colors"
          >
            <i className="ri-lock-2-line text-base" /> Change password
          </button>

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

      {changingPassword && (
        <ChangePasswordModal
          userId={user.id || user._id}
          onClose={() => setChangingPassword(false)}
        />
      )}
    </div>
  );
};

export default AccountMenu;
