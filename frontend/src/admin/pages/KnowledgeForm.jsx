import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchKnowledge, createKnowledge, updateKnowledge } from "../../api/admin";
import { Input, Textarea, Select } from "../../ui/Input";
import Button from "../../ui/Button";
import Alert from "../../ui/Alert";
import { AdminHeader, Spinner } from "../components/AdminUI";
import { REGIONS } from "../../utils/regions";

const CATEGORIES = [
  { value: "faq", label: "FAQ" },
  { value: "policy", label: "Booking policy" },
  { value: "region-guide", label: "Region guide" },
  { value: "guide", label: "Seasonal / themed guide" },
  { value: "tour-info", label: "Tour fine print" },
  { value: "permit", label: "Travel permit" },
];

const BLANK = { category: "faq", title: "", sourceTitle: "", region: "", body: "" };

const KnowledgeForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    // The corpus is small; fetch all and pick the one we're editing.
    fetchKnowledge()
      .then((items) => {
        if (cancelled) return;
        const a = (items || []).find((x) => String(x._id) === String(id));
        if (!a) { setError("Article not found."); return; }
        setForm({
          category: a.category || "faq",
          title: a.title || "",
          sourceTitle: a.sourceTitle || "",
          region: a.region || "",
          body: a.body || "",
        });
      })
      .catch((e) => setError(e?.response?.data?.message || "Failed to load article."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      category: form.category,
      title: form.title.trim(),
      sourceTitle: form.sourceTitle.trim(),
      region: form.region.trim(),
      body: form.body.trim(),
    };
    try {
      if (isEdit) await updateKnowledge(id, payload);
      else await createKnowledge(payload);
      navigate("/admin/knowledge");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the article.");
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading article..." />;

  return (
    <>
      <AdminHeader
        title={isEdit ? "Edit article" : "New article"}
        subtitle={isEdit ? form.title : "Add an FAQ, policy or guide. Saving updates the AI concierge too."}
      />

      <form onSubmit={handleSubmit} className="ds-card p-6 md:p-8 max-w-3xl space-y-5">
        {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

        <div className="grid sm:grid-cols-2 gap-5">
          <Select label="Type" value={form.category} onChange={set("category")} required>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select label="Region (optional)" value={form.region} onChange={set("region")}>
            <option value="">- none -</option>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>

        <Input
          label="Title"
          value={form.title}
          onChange={set("title")}
          required
          placeholder="e.g. How much deposit is required to confirm a booking?"
        />
        <Input
          label="Source / collection (optional)"
          value={form.sourceTitle}
          onChange={set("sourceTitle")}
          placeholder="e.g. Frequently asked questions · Kerala destination guide"
        />
        <Textarea
          label="Body"
          value={form.body}
          onChange={set("body")}
          required
          rows={10}
          placeholder="The answer or guide text. This is exactly what the site shows and what the concierge reads."
        />
        <p className="ds-small text-brand-muted">
          <i className="ri-sparkling-2-line text-brand-gold mr-1" />
          Saving re-indexes this article so the AI concierge stays in sync with the text.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create article"}
          </Button>
          <Button as="button" type="button" variant="ghost" onClick={() => navigate("/admin/knowledge")}>Cancel</Button>
        </div>
      </form>
    </>
  );
};

export default KnowledgeForm;
