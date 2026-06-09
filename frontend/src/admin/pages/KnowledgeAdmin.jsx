import React from "react";
import useResource from "../hooks/useResource";
import { fetchKnowledge, deleteKnowledge, reembedStaleKnowledge } from "../../api/admin";
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
} from "../components/AdminUI";

// Category display order + labels. These are the FAQs / policies / guides that
// power the public FAQ/Policies/Guides pages AND ground the RAG concierge, so
// edits here keep page + AI in sync (the backend re-embeds on save).
const GROUPS = [
  { key: "faq", label: "FAQs" },
  { key: "policy", label: "Booking policies" },
  { key: "region-guide", label: "Region guides" },
  { key: "guide", label: "Seasonal & themed guides" },
];

const KnowledgeAdmin = () => {
  const { data: items, loading, error, reload } = useResource(fetchKnowledge);
  const [reembedding, setReembedding] = React.useState(false);

  // Chunks whose stored search vector drifted from their text (a prior save's
  // embedding failed or AI was off). One click re-embeds just these.
  const staleCount = (items || []).filter((a) => a.needsReembed).length;

  const remove = (a) =>
    confirmAnd(`Move "${a.title}" to Trash? You can restore it later.`, () => deleteKnowledge(a._id), reload);

  const reembed = async () => {
    if (reembedding) return;
    setReembedding(true);
    try {
      const res = await reembedStaleKnowledge();
      alert(res?.message || "Re-embed complete.");
      reload();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Re-embed failed.");
    } finally {
      setReembedding(false);
    }
  };

  return (
    <>
      <AdminHeader
        title="Knowledge"
        subtitle="FAQs, policies and travel guides, shown on the site and used by the AI concierge. Edits re-sync the AI automatically."
      >
        {staleCount > 0 && (
          <button
            type="button"
            onClick={reembed}
            disabled={reembedding}
            className="ds-btn ds-btn-ghost ds-btn-sm disabled:opacity-60"
            title="Some articles' AI search vectors are out of date (a save couldn't reach the AI). Re-embed them so AI search matches the current text."
          >
            <i className={reembedding ? "ri-loader-4-line animate-spin" : "ri-restart-line"} />{" "}
            {reembedding ? "Re-embedding..." : `Re-embed stale (${staleCount})`}
          </button>
        )}
        <RowAction to="/admin/knowledge/new" className="ds-btn ds-btn-primary ds-btn-sm !text-brand-parchment">
          <i className="ri-add-line" /> New article
        </RowAction>
      </AdminHeader>

      {loading && <Spinner />}
      {error && !loading && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && (!items || items.length === 0) && (
        <EmptyState icon="ri-file-copy-line" title="No knowledge yet" hint="Add an FAQ, policy or guide, or run the knowledge seed." />
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="space-y-10">
          {GROUPS.map(({ key, label }) => {
            const rows = items.filter((a) => a.category === key);
            if (!rows.length) return null;
            return (
              <section key={key}>
                <h2 className="font-heading text-xl text-brand-espresso mb-4">
                  {label} <span className="ds-small text-brand-muted">({rows.length})</span>
                </h2>
                <Table>
                  <thead>
                    <tr>
                      <Th>Title</Th>
                      <Th>Source</Th>
                      <Th>Region</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a._id}>
                        <Td className="font-medium text-brand-espresso max-w-md">
                          <span className="inline-flex items-center gap-2">
                            {a.title}
                            {a.needsReembed && <Badge tone="warn">Needs re-embed</Badge>}
                          </span>
                        </Td>
                        <Td className="text-brand-muted">{a.sourceTitle || "-"}</Td>
                        <Td>{a.region ? <Badge tone="gold">{a.region}</Badge> : <span className="text-brand-muted">-</span>}</Td>
                        <Td className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-4">
                            <RowAction to={`/admin/knowledge/${a._id}/edit`}>
                              <i className="ri-pencil-line" /> Edit
                            </RowAction>
                            <RowAction danger onClick={() => remove(a)}>
                              <i className="ri-delete-bin-line" /> Delete
                            </RowAction>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
};

export default KnowledgeAdmin;
