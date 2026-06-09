import React from "react";
import { motion } from "framer-motion";
import Eyebrow from "../../ui/Eyebrow";

// Review intelligence panel. Renders the cached `tour.reviewInsights` the
// backend NLP pipeline (ai/reviews.js) builds from guest reviews: an editorial
// synthesis, the overall sentiment split, aspect-by-aspect positivity, and the
// recurring pros / things-to-know. Pure presentation, all analysis is done and
// cached server-side. Renders nothing until a tour has enough reviews to analyse.

const ASPECT_LABELS = {
  guide: "Guides",
  itinerary: "Itinerary",
  value: "Value",
  comfort: "Comfort",
  hospitality: "Hospitality",
  food: "Food",
  pace: "Pace",
  organisation: "Organisation",
};

const labelFor = (a) => ASPECT_LABELS[a] || a.charAt(0).toUpperCase() + a.slice(1);

const AspectBar = ({ aspect, score, mentions, i }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <span className="text-sm text-brand-espresso">
        {labelFor(aspect)}
        <span className="text-brand-muted/70 text-xs ml-1.5">
          {mentions} mention{mentions === 1 ? "" : "s"}
        </span>
      </span>
      <span className="text-sm font-medium text-brand-gold-dark tabular-nums">{score}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-brand-line overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-brand-gold"
        initial={{ width: 0 }}
        whileInView={{ width: `${score}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  </div>
);

const ReviewInsights = ({ insights }) => {
  if (!insights || !insights.generatedAt || (insights.basedOn || 0) < 1) return null;

  const { summary, pros = [], cons = [], aspects = [], sentiment = {}, basedOn } = insights;
  const pos = sentiment.positive || 0;
  const neu = sentiment.neutral || 0;
  const neg = sentiment.negative || 0;
  const total = pos + neu + neg || 1;
  const pct = (n) => Math.round((n / total) * 100);

  // Only show aspects with real signal (touched by more than one guest); cap for tidiness.
  const shownAspects = aspects.filter((a) => (a.mentions || 0) >= 2).slice(0, 6);

  return (
    <div className="ds-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5">
        <Eyebrow className="!mb-0">What travellers say</Eyebrow>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-brand-muted"
          title="Synthesised from guest reviews by our review-intelligence model"
        >
          <i className="ri-sparkling-2-line text-brand-gold" />
          AI synthesis
        </span>
      </div>

      {summary && (
        <p className="font-heading text-brand-espresso text-lg md:text-xl leading-snug text-balance mb-6">
          {summary}
        </p>
      )}

      {/* Overall sentiment split */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-2">
          <span className="ds-label !mb-0">Overall sentiment</span>
          <span className="text-xs text-brand-muted">
            from {basedOn} review{basedOn === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-brand-line">
          {pos > 0 && <div className="bg-brand-gold" style={{ width: `${pct(pos)}%` }} title={`Positive · ${pos}`} />}
          {neu > 0 && <div className="bg-brand-gold/30" style={{ width: `${pct(neu)}%` }} title={`Neutral · ${neu}`} />}
          {neg > 0 && <div className="bg-brand-espresso/60" style={{ width: `${pct(neg)}%` }} title={`Critical · ${neg}`} />}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-brand-muted">
          <Legend swatch="bg-brand-gold" label="Positive" value={pct(pos)} />
          <Legend swatch="bg-brand-gold/30" label="Neutral" value={pct(neu)} />
          <Legend swatch="bg-brand-espresso/60" label="Critical" value={pct(neg)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-x-10 gap-y-7">
        {/* Aspect scores */}
        {shownAspects.length > 0 && (
          <div className="space-y-4">
            <span className="ds-label">How each part landed</span>
            {shownAspects.map((a, i) => (
              <AspectBar key={a.aspect} {...a} i={i} />
            ))}
          </div>
        )}

        {/* Pros / things to know */}
        <div className="space-y-6">
          {pros.length > 0 && (
            <div>
              <span className="ds-label">What guests love</span>
              <ul className="space-y-2.5 mt-1">
                {pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 ds-body text-brand-ink">
                    <i className="ri-check-line text-brand-gold-dark mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <span className="ds-label">Worth knowing</span>
              <ul className="space-y-2.5 mt-1">
                {cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 ds-body text-brand-muted">
                    <i className="ri-arrow-right-s-line text-brand-muted mt-0.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Legend = ({ swatch, label, value }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`w-2.5 h-2.5 rounded-sm ${swatch}`} />
    {label} <span className="text-brand-espresso/70">{value}%</span>
  </span>
);

export default ReviewInsights;
