import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTour, createTour, updateTour } from "../../api/admin";
import { Input, Textarea, Select } from "../../ui/Input";
import Button from "../../ui/Button";
import Alert from "../../ui/Alert";
import { AdminHeader, Spinner, RowAction } from "../components/AdminUI";
import { REGIONS } from "../../utils/regions";

const BLANK = {
  title: "", city: "", address: "", region: "rajasthan",
  distance: "", duration: "", maxGroupSize: "", price: "", photo: "",
  desc: "", featured: false,
  overview: "", tags: "", bestMonths: "", highlights: "",
  itinerary: [],
};

const splitCSV = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const splitLines = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);

// Section wrapper so the (long) form reads as clear, labelled groups for a
// non-technical operator.
const Section = ({ title, hint, children }) => (
  <div className="border-t border-brand-line pt-7 first:border-0 first:pt-0">
    <h2 className="font-heading text-lg text-brand-espresso">{title}</h2>
    {hint && <p className="ds-small text-brand-muted mt-1 mb-4">{hint}</p>}
    <div className={hint ? "" : "mt-4"}>{children}</div>
  </div>
);

const TourForm = () => {
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
    fetchTour(id)
      .then((t) => {
        if (cancelled || !t) return;
        setForm({
          title: t.title || "", city: t.city || "", address: t.address || "",
          region: t.region || "rajasthan",
          distance: t.distance ?? "", duration: t.duration ?? "",
          maxGroupSize: t.maxGroupSize ?? "", price: t.price ?? "",
          photo: t.photo || "", desc: t.desc || "", featured: Boolean(t.featured),
          overview: t.overview || "",
          tags: (t.tags || []).join(", "),
          bestMonths: (t.bestMonths || []).join(", "),
          highlights: (t.highlights || []).join("\n"),
          itinerary: (t.itinerary || []).map((d) => ({ day: d.day ?? "", title: d.title || "", detail: d.detail || "" })),
        });
      })
      .catch((e) => setError(e?.response?.data?.message || "Failed to load tour."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // itinerary day rows
  const setDay = (i, key) => (e) =>
    setForm((f) => {
      const itinerary = f.itinerary.map((d, j) => (j === i ? { ...d, [key]: e.target.value } : d));
      return { ...f, itinerary };
    });
  const addDay = () =>
    setForm((f) => ({ ...f, itinerary: [...f.itinerary, { day: f.itinerary.length + 1, title: "", detail: "" }] }));
  const removeDay = (i) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.filter((_, j) => j !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      title: form.title, city: form.city, address: form.address, region: form.region,
      photo: form.photo, desc: form.desc, featured: form.featured,
      distance: Number(form.distance) || 0,
      duration: Number(form.duration) || undefined,
      maxGroupSize: Number(form.maxGroupSize) || 0,
      price: Number(form.price) || 0,
      overview: form.overview,
      tags: splitCSV(form.tags).map((t) => t.toLowerCase()),
      bestMonths: splitCSV(form.bestMonths),
      highlights: splitLines(form.highlights),
      itinerary: form.itinerary
        .map((d, i) => ({ day: Number(d.day) || i + 1, title: d.title.trim(), detail: d.detail.trim() }))
        .filter((d) => d.title || d.detail),
    };
    try {
      if (isEdit) await updateTour(id, payload);
      else await createTour(payload);
      navigate("/admin/tours");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the tour.");
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading tour..." />;

  return (
    <>
      <AdminHeader
        title={isEdit ? "Edit journey" : "New journey"}
        subtitle={isEdit ? form.title : "Add a journey to the catalogue."}
      />

      <form onSubmit={handleSubmit} className="ds-card p-6 md:p-8 max-w-3xl space-y-8">
        {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Basics */}
        <Section title="Basics">
          <div className="space-y-5">
            <Input label="Title" value={form.title} onChange={set("title")} required placeholder="Rajasthan Heritage Trail" />
            <div className="grid sm:grid-cols-2 gap-5">
              <Input label="Base city" value={form.city} onChange={set("city")} required placeholder="Jaipur" />
              <Select label="Region" value={form.region} onChange={set("region")} required>
                {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </div>
            <Input label="Route / address" value={form.address} onChange={set("address")} required placeholder="Delhi - Agra - Jaipur" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Input label="Price (₹ / person)" type="number" min="0" value={form.price} onChange={set("price")} required placeholder="125000" />
              <Input label="Duration (days)" type="number" min="1" value={form.duration} onChange={set("duration")} placeholder="7" />
              <Input label="Max group size" type="number" min="1" value={form.maxGroupSize} onChange={set("maxGroupSize")} required placeholder="12" />
              <Input label="Coverage (km)" type="number" min="0" value={form.distance} onChange={set("distance")} required placeholder="450" />
            </div>
            <Input label="Photo URL" value={form.photo} onChange={set("photo")} required placeholder="https://images.unsplash.com/..." />
            {form.photo && <img src={form.photo} alt="" className="h-40 w-full object-cover rounded-md border border-brand-line" />}
            <Textarea label="Short tagline (card description)" value={form.desc} onChange={set("desc")} required rows={3} placeholder="One or two lines shown on the journey card." />
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.featured} onChange={set("featured")} className="w-4 h-4 accent-brand-gold-dark" />
              <span className="text-sm text-brand-ink">Feature on the homepage</span>
            </label>
          </div>
        </Section>

        {/* Story & themes */}
        <Section title="Story & themes" hint="The richer content shown on the journey page (and used by the AI planner & concierge).">
          <div className="space-y-5">
            <Textarea label="Overview" value={form.overview} onChange={set("overview")} rows={5} placeholder="A few evocative paragraphs about the journey. Blank lines start new paragraphs." />
            <Input label="Tags" value={form.tags} onChange={set("tags")} placeholder="heritage, palaces, wildlife, food (comma-separated)" />
            <Input label="Best months" value={form.bestMonths} onChange={set("bestMonths")} placeholder="October, November, December (comma-separated)" />
            <Textarea label="Highlights" value={form.highlights} onChange={set("highlights")} rows={5} placeholder="One highlight per line, e.g.&#10;Sunrise at the Taj from Mehtab Bagh&#10;A private haveli dinner in Jaipur" />
          </div>
        </Section>

        {/* Itinerary */}
        <Section title="Day-by-day itinerary" hint="Add a card per day. Leave empty if you don't want to show an itinerary.">
          <div className="space-y-4">
            {form.itinerary.length === 0 && (
              <p className="ds-small text-brand-muted">No days yet.</p>
            )}
            {form.itinerary.map((d, i) => (
              <div key={i} className="rounded-lg border border-brand-line p-4 bg-brand-cream/40">
                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0">
                    <Input label="Day" type="number" min="1" value={d.day} onChange={setDay(i, "day")} />
                  </div>
                  <div className="flex-1">
                    <Input label="Title" value={d.title} onChange={setDay(i, "title")} placeholder="Arrive in Delhi" />
                  </div>
                  <button type="button" onClick={() => removeDay(i)} className="mt-7 text-brand-terracotta hover:text-red-700" aria-label="Remove day">
                    <i className="ri-delete-bin-line text-lg" />
                  </button>
                </div>
                <div className="mt-3">
                  <Textarea label="Detail" value={d.detail} onChange={setDay(i, "detail")} rows={2} placeholder="What happens on this day." />
                </div>
              </div>
            ))}
            <RowAction onClick={addDay}><i className="ri-add-line" /> Add day</RowAction>
          </div>
        </Section>

        <div className="flex items-center gap-3 pt-2 border-t border-brand-line">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create journey"}
          </Button>
          <Button as="button" type="button" variant="ghost" onClick={() => navigate("/admin/tours")}>Cancel</Button>
        </div>
      </form>
    </>
  );
};

export default TourForm;
