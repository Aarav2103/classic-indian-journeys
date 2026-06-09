import React, { useState } from "react";
import useResource from "../hooks/useResource";
import { fetchEnquiries, deleteEnquiry } from "../../api/admin";
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

const EnquiriesAdmin = () => {
  const { data: enquiries, loading, error, reload } = useResource(fetchEnquiries);
  const [openId, setOpenId] = useState(null);

  const remove = (c) =>
    confirmAnd(`Delete the enquiry from ${c.name}?`, () => deleteEnquiry(c._id), reload);

  return (
    <>
      <AdminHeader title="Enquiries" subtitle="Messages submitted through the contact form." />

      {loading && <Spinner />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && enquiries.length === 0 && (
        <EmptyState icon="ri-mail-line" title="No enquiries yet" hint="Contact-form messages will appear here." />
      )}

      {!loading && !error && enquiries.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Message</Th>
              <Th>Received</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((c) => {
              const open = openId === c._id;
              const long = (c.message || "").length > 90;
              return (
                <tr key={c._id}>
                  <Td className="font-medium text-brand-espresso">{c.name}</Td>
                  <Td className="text-brand-muted">
                    <a href={`mailto:${c.email}`} className="hover:text-brand-gold-dark">{c.email}</a>
                  </Td>
                  <Td className="text-brand-muted whitespace-nowrap">{c.phone}</Td>
                  <Td className="max-w-sm">
                    <span>{open || !long ? c.message : `${c.message.slice(0, 90)}...`}</span>
                    {long && (
                      <button
                        onClick={() => setOpenId(open ? null : c._id)}
                        className="ml-2 text-brand-gold-dark text-xs"
                      >
                        {open ? "Less" : "More"}
                      </button>
                    )}
                  </Td>
                  <Td className="text-brand-muted whitespace-nowrap">{formatDate(c.createdAt)}</Td>
                  <Td className="text-right">
                    <RowAction danger onClick={() => remove(c)}>
                      <i className="ri-delete-bin-line" /> Delete
                    </RowAction>
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

export default EnquiriesAdmin;
