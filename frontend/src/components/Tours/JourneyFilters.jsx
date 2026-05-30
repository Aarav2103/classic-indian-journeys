import React from "react";
import { Select } from "../../ui/Input";
import { useCurrency } from "../../context/CurrencyContext";

/**
 * Controlled filter bar for the Journeys page.
 * `value` = { q, region, price, travellers, duration, sort }
 * Parent owns the state (synced to the URL) and the filtering itself.
 */
const TRAVELLERS = [
  { value: "", label: "Any group size" },
  { value: "2", label: "2+ travellers" },
  { value: "4", label: "4+ travellers" },
  { value: "6", label: "6+ travellers" },
  { value: "8", label: "8+ travellers" },
];

const DURATIONS = [
  { value: "", label: "Any length" },
  { value: "short", label: "Up to 7 days" },
  { value: "mid", label: "8-12 days" },
  { value: "long", label: "13+ days" },
];

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

const JourneyFilters = ({ value, onChange, onClear, resultCount, total }) => {
  const { format } = useCurrency();
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  const money = (n) => format(n) || `₹${n.toLocaleString("en-IN")}`;
  const PRICES = [
    { value: "", label: "Any price" },
    { value: "0-200000", label: `Under ${money(200000)}` },
    { value: "200000-400000", label: `${money(200000)} - ${money(400000)}` },
    { value: "400000-", label: `Over ${money(400000)}` },
  ];

  const hasActive =
    value.q ||
    value.region ||
    value.price ||
    value.travellers ||
    value.duration ||
    (value.sort && value.sort !== "recommended");

  return (
    <div className="ds-card p-5 md:p-6">
      {/* Refine facets (region is chosen via the tiles above; search is the AI box) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Select label="Price" value={value.price} onChange={set("price")}>
          {PRICES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>

        <Select label="Travellers" value={value.travellers} onChange={set("travellers")}>
          {TRAVELLERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>

        <Select label="Trip length" value={value.duration} onChange={set("duration")}>
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </Select>

        <Select label="Sort by" value={value.sort} onChange={set("sort")}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      {/* Summary + clear */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="ds-small text-brand-muted">
          Showing <span className="text-brand-espresso font-medium">{resultCount}</span> of {total} journeys
        </p>
        {hasActive && (
          <button type="button" onClick={onClear} className="ds-btn ds-btn-link text-sm">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default JourneyFilters;
