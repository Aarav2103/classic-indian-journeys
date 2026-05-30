import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../../utils/config";
import Eyebrow from "../../ui/Eyebrow";

// Per-journey fine print (knowledge corpus, category "tour-info": What's included / not
// included / Good to know) plus that region's travel permits ("permit"), both
// scoped to this tour via tourRefs. Fetched from the SAME public knowledge endpoint
// the concierge cites, so the page and the AI never disagree. Renders nothing until
// a tour has authored fine print (seedTourKnowledge.js).

const stripPrefix = (t = "") => (t.includes("-") ? t.split("-").slice(1).join("-") : t);

// Subset-safe Remix icons only, an unmapped ri-* renders as an invisible box.
const INFO_ICON = {
  "What's included": "ri-check-line",
  "What's not included": "ri-close-line",
  "Good to know": "ri-compass-3-line",
};
const ORDER = ["What's included", "What's not included", "Good to know"];

const Card = ({ chunk, icon, accent }) => (
  <div id={String(chunk._id)} className="ds-card p-6 md:p-7 scroll-mt-28">
    <div className="flex items-center gap-2.5 mb-3">
      <i className={`${icon} text-xl ${accent}`} />
      <h3 className="font-heading text-brand-espresso text-lg">{stripPrefix(chunk.title)}</h3>
    </div>
    <p className="ds-body text-brand-muted text-pretty whitespace-pre-wrap">{chunk.body}</p>
  </div>
);

const TourFinePrint = ({ tourId }) => {
  const [chunks, setChunks] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (!tourId) return;
    let alive = true;
    axios
      .get(`${BASE_URL}/knowledge`, { params: { tour: tourId } })
      .then((res) => alive && setChunks(res.data?.data || []))
      .catch(() => alive && setChunks([]));
    return () => {
      alive = false;
    };
  }, [tourId]);

  // Deep-link: a concierge citation to /tours/:id#<chunkId> scrolls to the card,
  // on load and on a later same-page hash change.
  useEffect(() => {
    if (!chunks) return;
    const hash = decodeURIComponent((location.hash || "").replace("#", ""));
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [chunks, location.hash]);

  if (!chunks) return null;
  const info = chunks
    .filter((c) => c.category === "tour-info")
    .sort((a, b) => ORDER.indexOf(stripPrefix(a.title)) - ORDER.indexOf(stripPrefix(b.title)));
  const permits = chunks.filter((c) => c.category === "permit");
  if (!info.length && !permits.length) return null;

  return (
    <div>
      <Eyebrow>Good to know</Eyebrow>
      <h2 className="ds-h3 mt-3 mb-6">What's included &amp; what to expect</h2>
      <div className="space-y-4">
        {info.map((c) => (
          <Card
            key={c._id}
            chunk={c}
            icon={INFO_ICON[stripPrefix(c.title)] || "ri-compass-3-line"}
            accent={stripPrefix(c.title) === "What's not included" ? "text-brand-muted" : "text-brand-gold-dark"}
          />
        ))}
        {permits.map((c) => (
          <Card key={c._id} chunk={c} icon="ri-shield-star-line" accent="text-brand-gold-dark" />
        ))}
      </div>
    </div>
  );
};

export default TourFinePrint;
