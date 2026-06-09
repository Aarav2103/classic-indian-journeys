import React, { useState } from "react";
import { useCurrency } from "../../context/CurrencyContext";
import { regionLabel } from "../../utils/regions";

const EXAMPLES = [
  "wildlife trips under ₹2 lakh",
  "plan a 10-day Rajasthan honeymoon",
  "cheapest South India journeys",
  "relaxed 2-week trip with temples and backwaters",
];

/**
 * The single "smart box": one natural-language input that the backend auto-routes
 * to tour search (find) or the Trip Planner agent (plan). This component owns the
 * input + the interpreted status row; the parent owns the request and renders the
 * results (tour grid for find, ItineraryView for plan).
 *
 * Props: loading, ai (current result|null), onRun(query), onSwitch(), onClear(),
 *        initialQuery, unavailable.
 */
const SmartSearch = ({ loading, ai, onRun, onSwitch, onClear, initialQuery = "", unavailable = false }) => {
  const { format } = useCurrency();
  const [text, setText] = useState(initialQuery);

  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    if (q.length >= 2 && !loading) onRun(q);
  };

  if (unavailable) return null;

  return (
    <div className="ds-card p-5 md:p-6 border-brand-gold/40">
      <div className="flex items-center gap-2 mb-3">
        <i className="ri-sparkling-2-fill text-brand-gold-dark" />
        <span className="text-xs uppercase tracking-[0.16em] text-brand-muted">
          Ask in plain English, find a tour or plan a whole trip
        </span>
      </div>

      <form onSubmit={submit} className="relative">
        <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold-dark" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. plan a 12-day heritage trip across Rajasthan for a couple"
          aria-label="Search or plan in plain English"
          className="ds-input !pl-11 !pr-32"
          maxLength={300}
        />
        <button
          type="submit"
          disabled={loading || text.trim().length < 2}
          className="ds-btn ds-btn-primary ds-btn-sm absolute right-2 top-1/2 -translate-y-1/2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line animate-spin" /> Thinking
            </>
          ) : (
            <>
              <i className="ri-sparkling-line" /> Go
            </>
          )}
        </button>
      </form>

      {/* Example prompts before a search is active */}
      {!ai && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                onRun(ex);
              }}
              className="text-xs text-brand-muted hover:text-brand-gold-dark border border-brand-line hover:border-brand-gold/60 rounded-full px-3 py-1.5 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Interpreted status row once a result is in */}
      {ai && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ai.mode === "find" ? (
            <>
              <span className="ds-small text-brand-muted mr-1">
                <i className="ri-search-line mr-1 text-brand-gold-dark" /> Tours matching:
              </span>
              {buildChips(ai.intent || {}, format).map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-parchment border border-brand-line px-3 py-1 text-xs text-brand-espresso"
                >
                  <i className={`${c.icon} text-brand-gold-dark`} />
                  {c.label}
                </span>
              ))}
              <button type="button" onClick={onSwitch} className="ds-btn ds-btn-link text-sm ml-1">
                Plan a full itinerary instead &rarr;
              </button>
            </>
          ) : (
            <>
              <span className="ds-small text-brand-muted mr-1">
                <i className="ri-route-line mr-1 text-brand-gold-dark" /> A full itinerary for "{ai.query}"
              </span>
              <button type="button" onClick={onSwitch} className="ds-btn ds-btn-link text-sm">
                Just browse matching tours &rarr;
              </button>
            </>
          )}
          <button type="button" onClick={onClear} className="ds-btn ds-btn-link text-sm">
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

function buildChips(intent, format) {
  const money = (n) => format(n) || `₹${Number(n).toLocaleString("en-IN")}`;
  const chips = [];
  if (intent.region) chips.push({ icon: "ri-map-2-line", label: regionLabel(intent.region) });
  if (intent.city) chips.push({ icon: "ri-map-pin-2-line", label: intent.city });
  const { priceMin, priceMax } = intent;
  if (priceMin != null && priceMax != null) chips.push({ icon: "ri-price-tag-3-line", label: `${money(priceMin)}-${money(priceMax)}` });
  else if (priceMax != null) chips.push({ icon: "ri-price-tag-3-line", label: `Under ${money(priceMax)}` });
  else if (priceMin != null) chips.push({ icon: "ri-price-tag-3-line", label: `Over ${money(priceMin)}` });
  const { durationMin, durationMax } = intent;
  if (durationMin != null && durationMax != null)
    chips.push({ icon: "ri-calendar-line", label: durationMin === durationMax ? `${durationMin} days` : `${durationMin}-${durationMax} days` });
  else if (durationMax != null) chips.push({ icon: "ri-calendar-line", label: `Up to ${durationMax} days` });
  else if (durationMin != null) chips.push({ icon: "ri-calendar-line", label: `${durationMin}+ days` });
  if (intent.minGroupSize != null) chips.push({ icon: "ri-group-line", label: `${intent.minGroupSize}+ travellers` });
  if (intent.minRating != null) chips.push({ icon: "ri-star-line", label: `${intent.minRating}★ & up` });
  if (intent.featured) chips.push({ icon: "ri-sparkling-line", label: "Featured" });
  for (const kw of intent.keywords || []) chips.push({ icon: "ri-price-tag-line", label: kw });
  if (!chips.length) chips.push({ icon: "ri-compass-3-line", label: "all journeys" });
  return chips;
}

export default SmartSearch;
