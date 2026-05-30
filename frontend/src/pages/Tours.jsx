import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import useFetch from "../hooks/useFetch";
import TourCard from "../shared/TourCard";
import Newsletter from "../shared/Newsletter";
import PageHero from "../ui/PageHero";
import Button from "../ui/Button";
import JourneyFilters from "../components/Tours/JourneyFilters";
import SmartSearch from "../components/ai/SmartSearch";
import SafeImage from "../ui/SafeImage";
import { BASE_URL, AI_TIMEOUT } from "../utils/config";
import { REGIONS } from "../utils/regions";

const DEFAULTS = { q: "", region: "", price: "", travellers: "", duration: "", sort: "recommended" };

const inPriceBucket = (price, bucket) => {
  if (!bucket) return true;
  const [min, max] = bucket.split("-");
  const lo = Number(min) || 0;
  const hi = max === "" ? Infinity : Number(max);
  return price >= lo && price <= hi;
};

const inDurationBucket = (days, bucket) => {
  if (!bucket) return true;
  if (days == null) return false;
  if (bucket === "short") return days <= 7;
  if (bucket === "mid") return days >= 8 && days <= 12;
  if (bucket === "long") return days >= 13;
  return true;
};

const ratingOf = (tour) => tour.avgRating || 0;

const Skeleton = () => (
  <div className="ds-card animate-pulse">
    <div className="aspect-[4/3] bg-brand-line" />
    <div className="p-6 space-y-3">
      <div className="h-3 w-1/3 bg-brand-line rounded" />
      <div className="h-5 w-3/4 bg-brand-line rounded" />
      <div className="h-3 w-1/2 bg-brand-line rounded" />
    </div>
  </div>
);

const Tours = () => {
  const { data: tours, loading, error } = useFetch("tours");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // AI smart-box state. Only "find" results render here now, a "plan" intent is
  // handed off to the dedicated planner (/plan). ai = null | { mode:'find', query, intent, tours }
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const filters = { ...DEFAULTS, ...Object.fromEntries(params) };

  const updateFilters = (next) => {
    const sp = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "recommended")) sp[k] = v;
    });
    // preserve ?ai if present
    if (params.get("ai")) sp.ai = params.get("ai");
    setParams(sp, { replace: true });
  };
  const clearFilters = () => setParams({}, { replace: true });

  const all = Array.isArray(tours) ? tours : [];

  // AI smart box
  const runAssist = async (query) => {
    setAiLoading(true);
    setAi(null);
    try {
      const res = await axios.post(`${BASE_URL}/tours/assist`, { query }, { timeout: AI_TIMEOUT });
      const d = res.data;
      if (d.mode === "plan") {
        // Planning lives on the dedicated planner, hand off (it seeds from ?q=).
        navigate(`/plan?q=${encodeURIComponent(query)}`);
        return;
      }
      setAi({ mode: "find", query, intent: d.intent || {}, tours: Array.isArray(d.data) ? d.data : [] });
    } catch (err) {
      if (err?.response?.status === 503) setAiUnavailable(true);
    } finally {
      setAiLoading(false);
    }
  };

  // From a search result, the "Plan a full itinerary instead" affordance hands
  // the query off to the conversational planner.
  const onSwitch = () => {
    if (ai?.mode === "find") navigate(`/plan?q=${encodeURIComponent(ai.query)}`);
  };

  const clearAi = () => {
    setAi(null);
    if (params.get("ai")) {
      const sp = Object.fromEntries(params);
      delete sp.ai;
      setParams(sp, { replace: true });
    }
  };

  // Auto-run a query passed via ?ai= (e.g. from the homepage hero) once.
  const aiParam = params.get("ai");
  useEffect(() => {
    if (aiParam && !ai && !aiLoading && !aiUnavailable) runAssist(aiParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiParam]);

  // Browse mode (filters)
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    let out = all.filter((t) => {
      if (q) {
        const hay = `${t.title || ""} ${t.city || ""} ${t.region || ""} ${t.desc || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.region && t.region !== filters.region) return false;
      if (!inPriceBucket(t.price || 0, filters.price)) return false;
      if (filters.travellers && (t.maxGroupSize || 0) < Number(filters.travellers)) return false;
      if (!inDurationBucket(t.duration ?? null, filters.duration)) return false;
      return true;
    });
    if (filters.sort === "price-asc") out = [...out].sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (filters.sort === "price-desc") out = [...out].sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (filters.sort === "rating") out = [...out].sort((a, b) => ratingOf(b) - ratingOf(a));
    else out = [...out].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return out;
  }, [all, filters.q, filters.region, filters.price, filters.travellers, filters.duration, filters.sort]);

  // Region tiles (browse): one representative photo per region from the catalogue.
  const regionTiles = useMemo(() => {
    return REGIONS.map((r) => {
      const inRegion = all.filter((t) => t.region === r.value);
      return { ...r, count: inRegion.length, photo: inRegion[0]?.photo };
    }).filter((r) => r.count > 0);
  }, [all]);

  return (
    <>
      <PageHero
        eyebrow="Journeys"
        title="Find a tour, or let AI plan the whole trip"
        lead="Search our itineraries in plain English, browse by region, or describe your dream trip and our planner will draft a day-by-day route from journeys we actually run."
      />

      <section className="bg-brand-parchment ds-section-sm">
        <div className="ds-container">
          <div className="max-w-5xl mx-auto">
            <SmartSearch
              loading={aiLoading}
              ai={ai}
              onRun={runAssist}
              onSwitch={onSwitch}
              onClear={clearAi}
              initialQuery={aiParam || ""}
              unavailable={aiUnavailable}
            />
          </div>
        </div>
      </section>

      <section className="bg-brand-cream ds-section">
        <div className="ds-container">
          {/* AI loading */}
          {aiLoading && !ai && (
            <div className="text-center py-20">
              <i className="ri-sparkling-2-fill text-brand-gold-dark text-3xl animate-pulse" />
              <p className="ds-lead mt-5">Working on it...</p>
              <p className="ds-small text-brand-muted mt-1">Searching our journeys, or opening the planner if you asked for a full trip.</p>
            </div>
          )}

          {/* AI find result */}
          {ai?.mode === "find" && !aiLoading && (
            ai.tours.length > 0 ? (
              <>
                <p className="ds-small text-brand-muted mb-6">
                  <span className="text-brand-espresso font-medium">{ai.tours.length}</span>{" "}
                  {ai.tours.length === 1 ? "journey matches" : "journeys match"} "{ai.query}"
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {ai.tours.map((t) => <TourCard key={t._id} tour={t} />)}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="ds-lead mb-6">No journeys match "{ai.query}". Try rephrasing, or browse below.</p>
                <Button onClick={clearAi} variant="secondary">Back to browsing</Button>
              </div>
            )
          )}

          {/* Browse mode */}
          {!ai && !aiLoading && (
            <>
              {/* Region tiles */}
              {regionTiles.length > 0 && !filters.region && (
                <div className="mb-12">
                  <h2 className="ds-h4 mb-5">Browse by region</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {regionTiles.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => updateFilters({ ...filters, region: r.value })}
                        className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-brand-line text-left"
                      >
                        <SafeImage src={r.photo} alt={r.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-t from-[#1a0f06]/80 via-[#1a0f06]/20 to-transparent" />
                        <span className="absolute bottom-3 left-4 right-4">
                          <span className="block font-heading text-brand-parchment text-lg leading-tight">{r.label}</span>
                          <span className="block text-brand-parchment/70 text-xs mt-0.5">{r.count} {r.count === 1 ? "journey" : "journeys"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-w-5xl mx-auto mb-10">
                <JourneyFilters
                  value={filters}
                  onChange={updateFilters}
                  onClear={clearFilters}
                  resultCount={filtered.length}
                  total={all.length}
                />
              </div>

              {loading && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} />)}
                </div>
              )}

              {error && !loading && (
                <div className="text-center py-16">
                  <p className="ds-lead mb-6">We couldn't load journeys right now.</p>
                  <Button onClick={() => window.location.reload()} variant="secondary">Try again</Button>
                </div>
              )}

              {!loading && !error && (
                filtered.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map((tour) => <TourCard key={tour._id} tour={tour} />)}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="ds-lead mb-6">
                      {all.length === 0 ? "No journeys published yet, check back soon." : "No journeys match your filters. Try widening them."}
                    </p>
                    {all.length > 0 && <Button onClick={clearFilters} variant="secondary">Clear filters</Button>}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </section>

      <Newsletter />
    </>
  );
};

export default Tours;
