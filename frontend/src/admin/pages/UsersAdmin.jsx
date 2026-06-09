import React, { useContext } from "react";
import useResource from "../hooks/useResource";
import { fetchUsers, setUserRole, deleteUser } from "../../api/admin";
import { AuthContext } from "../../context/AuthContext";
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

const UsersAdmin = () => {
  const { data: users, loading, error, reload } = useResource(fetchUsers);
  const { user: me } = useContext(AuthContext);
  const myId = me?.id || me?._id;

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
      <AdminHeader title="Users" subtitle="Registered accounts. Promote trusted users to admin, or remove accounts." />

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
    </>
  );
};

export default UsersAdmin;
