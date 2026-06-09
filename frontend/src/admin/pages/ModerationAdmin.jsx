import React from "react";
import useResource from "../hooks/useResource";
import { fetchReviews, deleteReview } from "../../api/admin";
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

const Reviews = () => {
  const { data: reviews, loading, error, reload } = useResource(fetchReviews);

  const remove = (r) =>
    confirmAnd(`Delete this review by ${r.username}?`, () => deleteReview(r._id), reload);

  return (
    <section className="mb-12">
      <h2 className="font-heading text-xl text-brand-espresso mb-4">
        Reviews {reviews && <span className="ds-small text-brand-muted">({reviews.length})</span>}
      </h2>
      {loading && <Spinner label="Loading reviews..." />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}
      {!loading && !error && reviews.length === 0 && (
        <EmptyState icon="ri-star-line" title="No reviews yet" />
      )}
      {!loading && !error && reviews.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Author</Th>
              <Th>Rating</Th>
              <Th>Review</Th>
              <Th>Tour</Th>
              <Th>When</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r._id}>
                <Td className="font-medium text-brand-espresso">{r.username}</Td>
                <Td><Badge tone="gold">{r.rating}★</Badge></Td>
                <Td className="max-w-sm text-brand-ink">{r.reviewText}</Td>
                <Td className="text-brand-muted">{r.tour?.title || "-"}</Td>
                <Td className="text-brand-muted whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                <Td className="text-right">
                  <RowAction danger onClick={() => remove(r)}>
                    <i className="ri-delete-bin-line" /> Delete
                  </RowAction>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
};

const ModerationAdmin = () => (
  <>
    <AdminHeader title="Moderation" subtitle="Review and remove guest-submitted reviews." />
    <Reviews />
  </>
);

export default ModerationAdmin;
