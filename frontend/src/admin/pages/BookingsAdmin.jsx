import React from "react";
import useResource from "../hooks/useResource";
import { fetchBookings, deleteBooking } from "../../api/admin";
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

const BookingsAdmin = () => {
  const { data: bookings, loading, error, reload } = useResource(fetchBookings);

  const remove = (b) =>
    confirmAnd(`Delete the booking from ${b.fullName}?`, () => deleteBooking(b._id), reload);

  return (
    <>
      <AdminHeader
        title="Bookings"
        subtitle="Reservation requests submitted from journey pages. (No payment is taken, these are leads.)"
      />

      {loading && <Spinner />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState icon="ri-calendar-check-line" title="No bookings yet" hint="Booking requests will appear here." />
      )}

      {!loading && !error && bookings.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Traveller</Th>
              <Th>Journey</Th>
              <Th>Phone</Th>
              <Th>Group</Th>
              <Th>Total</Th>
              <Th>Travel date</Th>
              <Th>Received</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <Td className="font-medium text-brand-espresso">{b.fullName}</Td>
                <Td>{b.tourName}</Td>
                <Td className="text-brand-muted whitespace-nowrap">{b.phone}</Td>
                <Td>{b.groupSize}</Td>
                <Td className="whitespace-nowrap">
                  {b.totalInr != null ? `₹${b.totalInr.toLocaleString("en-IN")}` : "-"}
                </Td>
                <Td className="whitespace-nowrap">{formatDate(b.bookAt)}</Td>
                <Td className="text-brand-muted whitespace-nowrap">{formatDate(b.createdAt)}</Td>
                <Td className="text-right">
                  <RowAction danger onClick={() => remove(b)}>
                    <i className="ri-delete-bin-line" /> Delete
                  </RowAction>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

export default BookingsAdmin;
