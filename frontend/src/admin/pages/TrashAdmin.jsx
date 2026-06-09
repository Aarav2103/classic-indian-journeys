import React from "react";
import useResource from "../hooks/useResource";
import { fetchTrash, restoreTrash, purgeTrash } from "../../api/admin";
import {
  AdminHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Table,
  Th,
  Td,
  RowAction,
  confirmAnd,
  formatDate,
} from "../components/AdminUI";

const TYPE_LABELS = {
  tours: "Journeys",
  reviews: "Reviews",
  bookings: "Bookings",
  users: "Users",
  enquiries: "Enquiries",
  knowledge: "Knowledge",
};

const TrashAdmin = () => {
  const { data: payload, loading, error, reload } = useResource(fetchTrash);
  const groups = payload?.data || {};
  const total = payload?.total || 0;

  const restore = async (type, id) => {
    try {
      await restoreTrash(type, id);
      reload();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not restore.");
    }
  };

  const purge = (type, item) =>
    confirmAnd(
      `Permanently delete "${item.title}"? This CANNOT be undone.`,
      () => purgeTrash(type, item._id),
      reload
    );

  return (
    <>
      <AdminHeader
        title="Trash"
        subtitle="Deleted items are kept here so you can restore them. Emptying is permanent."
      />

      {loading && <Spinner />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && total === 0 && (
        <EmptyState icon="ri-delete-bin-line" title="Trash is empty" hint="Anything you delete will appear here, ready to restore." />
      )}

      {!loading && !error && total > 0 && (
        <div className="space-y-10">
          {Object.entries(groups).map(([type, items]) =>
            items.length ? (
              <section key={type}>
                <h2 className="font-heading text-xl text-brand-espresso mb-4">
                  {TYPE_LABELS[type] || type} <span className="ds-small text-brand-muted">({items.length})</span>
                </h2>
                <Table>
                  <thead>
                    <tr>
                      <Th>Item</Th>
                      <Th>Deleted</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it._id}>
                        <Td>
                          <span className="font-medium text-brand-espresso">{it.title}</span>
                          {it.subtitle && <span className="block ds-small text-brand-muted">{it.subtitle}</span>}
                        </Td>
                        <Td className="text-brand-muted whitespace-nowrap">{formatDate(it.deletedAt)}</Td>
                        <Td className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-4">
                            <RowAction onClick={() => restore(type, it._id)}>
                              <i className="ri-restart-line" /> Restore
                            </RowAction>
                            <RowAction danger onClick={() => purge(type, it)}>
                              <i className="ri-delete-bin-line" /> Delete forever
                            </RowAction>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </section>
            ) : null
          )}
        </div>
      )}
    </>
  );
};

export default TrashAdmin;
