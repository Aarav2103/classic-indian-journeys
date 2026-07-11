import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../../utils/config";
import Eyebrow from "../../ui/Eyebrow";

// Per-journey fine print (knowledge corpus, category "tour-info") + that region's
// travel permits ("permit"), scoped to this tour via tourRefs. Fetched from the SAME
// public knowledge endpoint the concierge cites (scope:all here, so the retrieval-only
// "deep" sections are included on the detail page even though they're hidden from the
// Guides/FAQ hubs). The 3 core cards (included / not included / good to know) render
// upfront; the deeper 9 sections collapse into a single "More about this journey" panel
// so the page stays compact. Renders nothing until a tour has authored fine print.

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
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!tourId) return;
    let alive = true;
    axios
      .get(`${BASE_URL}/knowledge`, { params: { tour: tourId, scope: "all" } })
      .then((res) => alive && setChunks(res.data?.data || []))
      .catch(() => alive && setChunks([]));
    return () => {
      alive = false;
    };
  }, [tourId]);

  // Deep-link: a concierge citation to /tours/:id#<chunkId> scrolls to the card, on
  // load and on a later same-page hash change. If the target lives inside the collapsed
  // "More about this journey" panel, open it first so the scroll can reach it.
  useEffect(() => {
    if (!chunks) return;
    const hash = decodeURIComponent((location.hash || "").replace("#", ""));
    if (!hash) return;
    const isDeep = chunks.some((c) => String(c._id) === hash && c.category === "tour-info" && c.sourceType === "deep");
    if (isDeep) setOpen(true);
    requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [chunks, location.hash]);

  if (!chunks) return null;
  const tourInfo = chunks.filter((c) => c.category === "tour-info");
  const core = tourInfo
    .filter((c) => c.sourceType !== "deep")
    .sort((a, b) => ORDER.indexOf(stripPrefix(a.title)) - ORDER.indexOf(stripPrefix(b.title)));
  const more = tourInfo.filter((c) => c.sourceType === "deep"); // authored order (insertion / _id asc)
  const permits = chunks.filter((c) => c.category === "permit");
  if (!core.length && !more.length && !permits.length) return null;

  return (
    <div>
      <Eyebrow>Good to know</Eyebrow>
      <h2 className="ds-h3 mt-3 mb-6">What's included &amp; what to expect</h2>
      <div className="space-y-4">
        {core.map((c) => (
          <Card
            key={c._id}
            chunk={c}
            icon={INFO_ICON[stripPrefix(c.title)] || "ri-compass-3-line"}
            accent={stripPrefix(c.title) === "What's not included" ? "text-brand-muted" : "text-brand-gold-dark"}
          />
        ))}

        {more.length > 0 && (
          <div className="ds-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-6 text-left p-6 md:p-7"
            >
              <span className="flex items-center gap-2.5">
                <i className="ri-compass-3-line text-xl text-brand-gold-dark" />
                <span className="font-heading text-brand-espresso text-lg">More about this journey</span>
              </span>
              <i className={`ri-arrow-down-s-line text-2xl text-brand-gold-dark shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="px-6 md:px-7 pb-7 -mt-1 space-y-6">
                {more.map((c) => (
                  <div key={c._id} id={String(c._id)} className="scroll-mt-28">
                    <h3 className="font-heading text-brand-espresso text-base mb-2">{stripPrefix(c.title)}</h3>
                    <p className="ds-body text-brand-muted text-pretty whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {permits.map((c) => (
          <Card key={c._id} chunk={c} icon="ri-shield-star-line" accent="text-brand-gold-dark" />
        ))}
      </div>
    </div>
  );
};

export default TourFinePrint;
