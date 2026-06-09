import React, { useState } from "react";
import useResource from "../hooks/useResource";
import { fetchTours, deleteTour, updateTour } from "../../api/admin";
import { useCurrency } from "../../context/CurrencyContext";
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
} from "../components/AdminUI";

const ToursAdmin = () => {
  const { data: tours, loading, error, reload } = useResource(fetchTours);
  const { format } = useCurrency();
  const [busyId, setBusyId] = useState(null);

  const remove = (tour) =>
    confirmAnd(`Move "${tour.title}" to Trash? You can restore it later.`, () => deleteTour(tour._id), reload);

  // One-click homepage curation: flip `featured` and reload.
  const toggleFeatured = async (tour) => {
    setBusyId(tour._id);
    try {
      await updateTour(tour._id, { featured: !tour.featured });
      reload();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not update.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Tours" subtitle="Create and edit journeys. Tap the star to feature a journey on the homepage.">
        <RowAction to="/admin/tours/new" className="ds-btn ds-btn-primary ds-btn-sm !text-brand-parchment">
          <i className="ri-add-line" /> New journey
        </RowAction>
      </AdminHeader>

      {loading && <Spinner />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && tours.length === 0 && (
        <EmptyState
          icon="ri-map-2-line"
          title="No tours yet"
          hint="Add your first journey so it appears on the site."
        >
          <RowAction to="/admin/tours/new" className="ds-btn ds-btn-primary ds-btn-sm !text-brand-parchment">
            <i className="ri-add-line" /> New tour
          </RowAction>
        </EmptyState>
      )}

      {!loading && !error && tours.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Region</Th>
              <Th>City</Th>
              <Th>Price</Th>
              <Th>Featured</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {tours.map((t) => (
              <tr key={t._id}>
                <Td className="font-medium text-brand-espresso">{t.title}</Td>
                <Td className="text-brand-muted">{t.region}</Td>
                <Td className="text-brand-muted">{t.city}</Td>
                <Td>{format(t.price) || "-"}</Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => toggleFeatured(t)}
                    disabled={busyId === t._id}
                    aria-pressed={Boolean(t.featured)}
                    title={t.featured ? "Featured on homepage, click to unfeature" : "Click to feature on homepage"}
                    className={`inline-flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${
                      t.featured ? "text-brand-gold-dark" : "text-brand-muted hover:text-brand-gold-dark"
                    }`}
                  >
                    <i className={t.featured ? "ri-star-fill" : "ri-star-line"} />
                    {t.featured ? "Featured" : "Feature"}
                  </button>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-4">
                    <RowAction to={`/admin/tours/${t._id}/edit`}>
                      <i className="ri-pencil-line" /> Edit
                    </RowAction>
                    <RowAction danger onClick={() => remove(t)}>
                      <i className="ri-delete-bin-line" /> Delete
                    </RowAction>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

export default ToursAdmin;
