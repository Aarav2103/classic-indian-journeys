import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import GoldRule from "../../ui/GoldRule";
import SafeImage from "../../ui/SafeImage";
import { useCurrency } from "../../context/CurrencyContext";

const REFINEMENTS = [
  { label: "Make it cheaper", instruction: "make it noticeably more affordable" },
  { label: "More premium", instruction: "make it more luxurious and exclusive" },
  { label: "Shorter", instruction: "make the trip a few days shorter" },
  { label: "Longer", instruction: "make the trip a few days longer" },
  { label: "Add wildlife", instruction: "weave in wildlife and safaris" },
  { label: "More relaxed", instruction: "slow the pace down with more downtime" },
];

// Compact horizontal tour card for the "Built from these real journeys" list -
// reads far better than a full TourCard in the narrow planner/chat column.
const MiniTourCard = ({ tour, format }) => {
  const { _id, title, city, photo, price, duration } = tour || {};
  return (
    <Link
      to={`/tours/${_id}`}
      aria-label={`View ${title}`}
      className="group ds-card ds-card-hover flex items-stretch overflow-hidden"
    >
      <div className="w-28 sm:w-40 shrink-0 self-stretch bg-brand-line overflow-hidden">
        <SafeImage
          src={photo}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      {/* Content is stacked vertically, nothing competes horizontally, so it
          can't overflow / clip even in a narrow column. The whole card links. */}
      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] uppercase tracking-[0.12em] text-brand-muted">
          {city && (
            <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
              <i className="ri-map-pin-2-line text-brand-gold shrink-0" />
              <span className="truncate">{city}</span>
            </span>
          )}
          {duration ? (
            <span className="inline-flex items-center gap-1 shrink-0">
              <i className="ri-calendar-line" /> {duration} days
            </span>
          ) : null}
        </div>
        <h4 className="font-heading text-brand-espresso text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-brand-gold-dark transition-colors">
          {title}
        </h4>
        {price > 0 && (
          <p className="font-heading text-brand-espresso">
            {format(price)}
            <span className="text-xs text-brand-muted ml-1 font-body">/ person</span>
          </p>
        )}
      </div>
    </Link>
  );
};

/**
 * Shared renderer for an AI-generated, catalogue-grounded itinerary. Used by the
 * smart box (plan mode) and the Plan page. Pure display, except for optional
 * refine chips: pass `onRefine(instruction)` to show them (parent does the call).
 */
const ItineraryView = ({ itinerary, tours = [], onRefine, refining = false }) => {
  const { format } = useCurrency();
  if (!itinerary) return null;

  const days = itinerary.days || [];
  const price = itinerary.estimatedPriceINR || 0;

  return (
    <div>
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-brand-gold-dark mb-3">
          <i className="ri-sparkling-2-fill" /> Built by AI from our real catalogue
        </span>
        <h2 className="ds-h2 mt-1 text-balance">{itinerary.title}</h2>
        <GoldRule />
        {itinerary.summary && <p className="ds-lead">{itinerary.summary}</p>}
      </div>

      {price > 0 && (
        <div className="ds-card p-6 md:p-7 mb-8 flex flex-wrap items-end justify-between gap-3 bg-brand-parchment/70">
          <div>
            <p className="ds-eyebrow">Estimated from</p>
            <p className="font-heading text-3xl text-brand-espresso mt-1">
              {format(price)}
              <span className="text-sm text-brand-muted ml-2 font-body">/ person · indicative</span>
            </p>
          </div>
          <p className="ds-small max-w-xs">
            Pricing flexes by season, property, guide and pace. We'll quote firm once we talk.
          </p>
        </div>
      )}

      {onRefine && (
        <div className="mb-8">
          <p className="ds-small text-brand-muted mb-2">
            <i className="ri-magic-line mr-1 text-brand-gold-dark" /> Tweak it:
          </p>
          <div className="flex flex-wrap gap-2">
            {REFINEMENTS.map((r) => (
              <button
                key={r.label}
                type="button"
                disabled={refining}
                onClick={() => onRefine(r.instruction)}
                className="text-xs text-brand-espresso border border-brand-line hover:border-brand-gold/60 hover:bg-brand-parchment rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className={`relative border-l-2 border-brand-gold/30 ml-3 space-y-1 transition-opacity ${refining ? "opacity-40" : ""}`}>
        {days.map((d, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 12) * 0.05 }}
            className="relative pl-7 py-4"
          >
            <span className="absolute -left-[11px] top-5 w-5 h-5 rounded-full bg-brand-cream border-2 border-brand-gold flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
            </span>
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-xl text-brand-gold-dark">{String(d.day).padStart(2, "0")}</span>
              <h4 className="font-heading text-brand-espresso text-lg">{d.title}</h4>
            </div>
            {d.description && <p className="ds-body mt-1 text-brand-muted">{d.description}</p>}
          </motion.li>
        ))}
      </ol>

      {itinerary.notes && <p className="ds-small text-brand-muted mt-6 italic max-w-2xl">{itinerary.notes}</p>}

      {tours.length > 0 && (
        <div className="mt-14">
          <h3 className="ds-h4 mb-1">Built from these real journeys</h3>
          <p className="ds-small text-brand-muted mb-6">
            Every day above is grounded in tours you can actually book.
          </p>
          <div className="space-y-3">
            {tours.map((t) => (
              <MiniTourCard key={t._id} tour={t} format={format} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryView;
