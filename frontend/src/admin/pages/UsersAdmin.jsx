import React, { useContext, useEffect, useState } from "react";
import useResource from "../hooks/useResource";
import { fetchUsers, setUserRole, resetUserPassword, deleteUser } from "../../api/admin";
import { AuthContext } from "../../context/AuthContext";
import { Input } from "../../ui/Input";
import Button from "../../ui/Button";
import Alert from "../../ui/Alert";
import {
  AdminHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Table,
  Th,
  Td,
  RowAction,
  Badge,
  confirmAnd,
  formatDate,
} from "../components/AdminUI";

// Admin-side recovery for locked-out guests: sets a new password directly
// (no current-password proof, the owner-side flow in the account menu
// requires it). Share the new password with the guest out of band.
const ResetPasswordModal = ({ user, onClose }) => {
  const [form, setForm] = useState({ next: "", confirm: "" });
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
      setStatus({ type: "error", msg: "Password must be at least 6 characters." });
      return;
    }
    if (form.next !== form.confirm) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await resetUserPassword(user._id, form.next);
      setStatus({ type: "success", msg: "Password reset." });
      setTimeout(onClose, 1000);
    } catch (err) {
      setStatus({
        type: "error",
        msg: err?.response?.data?.message || "Failed to reset password.",
      });
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reset password"
    >
      <div className="absolute inset-0 bg-brand-espresso/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-lg bg-brand-white border border-brand-line shadow-card p-6 space-y-4"
      >
        <div>
          <h2 className="font-heading text-lg text-brand-espresso">Reset password</h2>
          <p className="ds-small text-brand-muted mt-1">
            Sets a new password for <span className="font-medium text-brand-espresso">{user.username}</span>.
            They can change it themselves from the account menu afterwards.
          </p>
        </div>
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
            {saving ? "Saving..." : "Reset password"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const UsersAdmin = () => {
  const { data: users, loading, error, reload } = useResource(fetchUsers);
  const { user: me } = useContext(AuthContext);
  const myId = me?.id || me?._id;
  const [resetting, setResetting] = useState(null);

  const toggleRole = (u) => {
    const next = u.role === "admin" ? "user" : "admin";
    confirmAnd(
      `Make ${u.username} a${next === "admin" ? "n admin" : " regular user"}?`,
      () => setUserRole(u._id, next),
      reload
    );
  };

  const remove = (u) =>
    confirmAnd(`Delete ${u.username}? This cannot be undone.`, () => deleteUser(u._id), reload);

  return (
    <>
      <AdminHeader title="Users" subtitle="Registered accounts. Promote trusted users to admin, reset passwords, or remove accounts." />

      {loading && <Spinner />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && users.length === 0 && (
        <EmptyState icon="ri-group-line" title="No users yet" />
      )}

      {!loading && !error && users.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = String(u._id) === String(myId);
              return (
                <tr key={u._id}>
                  <Td className="font-medium text-brand-espresso">
                    {u.username} {isMe && <span className="ds-small text-brand-muted">(you)</span>}
                  </Td>
                  <Td className="text-brand-muted">{u.email}</Td>
                  <Td>
                    {u.role === "admin" ? <Badge tone="gold">Admin</Badge> : <Badge>User</Badge>}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    {isMe ? (
                      <span className="ds-small text-brand-muted">-</span>
                    ) : (
                      <div className="inline-flex items-center gap-4">
                        <RowAction onClick={() => toggleRole(u)}>
                          <i className={u.role === "admin" ? "ri-arrow-down-line" : "ri-shield-star-line"} />
                          {u.role === "admin" ? "Demote" : "Make admin"}
                        </RowAction>
                        <RowAction onClick={() => setResetting(u)}>
                          <i className="ri-lock-2-line" /> Reset password
                        </RowAction>
                        <RowAction danger onClick={() => remove(u)}>
                          <i className="ri-delete-bin-line" /> Delete
                        </RowAction>
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {resetting && (
        <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      )}
    </>
  );
};

export default UsersAdmin;
