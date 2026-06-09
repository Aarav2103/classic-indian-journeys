import React from "react";
import { Link } from "react-router-dom";
import useResource from "../hooks/useResource";
import {
  fetchTours,
  fetchBookings,
  fetchEnquiries,
  fetchUsers,
  fetchKnowledge,
} from "../../api/admin";
import {
  AdminHeader,
  StatCard,
  Panel,
  Spinner,
  ErrorBox,
  Table,
  Th,
  Td,
  formatDate,
} from "../components/AdminUI";

const loadOverview = async () => {
  const [tours, bookings, enquiries, users, knowledge] = await Promise.all([
    fetchTours(),
    fetchBookings(),
    fetchEnquiries(),
    fetchUsers(),
    fetchKnowledge(),
  ]);
  return { tours, bookings, enquiries, users, knowledge };
};

const Dashboard = () => {
  const { data, loading, error, reload } = useResource(loadOverview);

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const { tours, bookings, enquiries, users, knowledge } = data;
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const recentEnquiries = [...enquiries]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        subtitle="An overview of everything happening on Classic Indian Journeys."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label="Journeys" value={tours.length} icon="ri-map-2-line" to="/admin/tours" />
        <StatCard label="Bookings" value={bookings.length} icon="ri-calendar-check-line" to="/admin/bookings" />
        <StatCard label="Enquiries" value={enquiries.length} icon="ri-mail-line" to="/admin/enquiries" />
        <StatCard label="Knowledge" value={knowledge.length} icon="ri-file-copy-line" to="/admin/knowledge" />
        <StatCard label="Users" value={users.length} icon="ri-group-line" to="/admin/users" />
        <StatCard
          label="Admins"
          value={users.filter((u) => u.role === "admin").length}
          icon="ri-shield-star-line"
          to="/admin/users"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg text-brand-espresso">Recent bookings</h2>
            <Link to="/admin/bookings" className="ds-small text-brand-gold-dark">View all</Link>
          </div>
          {recentBookings.length === 0 ? (
            <Panel className="p-6"><p className="ds-small text-brand-muted">No bookings yet.</p></Panel>
          ) : (
            <Table>
              <thead>
                <tr><Th>Traveller</Th><Th>Journey</Th><Th>When</Th></tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b._id}>
                    <Td>{b.fullName}</Td>
                    <Td>{b.tourName}</Td>
                    <Td>{formatDate(b.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg text-brand-espresso">Recent enquiries</h2>
            <Link to="/admin/enquiries" className="ds-small text-brand-gold-dark">View all</Link>
          </div>
          {recentEnquiries.length === 0 ? (
            <Panel className="p-6"><p className="ds-small text-brand-muted">No enquiries yet.</p></Panel>
          ) : (
            <Table>
              <thead>
                <tr><Th>Name</Th><Th>Email</Th><Th>When</Th></tr>
              </thead>
              <tbody>
                {recentEnquiries.map((c) => (
                  <tr key={c._id}>
                    <Td>{c.name}</Td>
                    <Td className="text-brand-muted">{c.email}</Td>
                    <Td>{formatDate(c.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
