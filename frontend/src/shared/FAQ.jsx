import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import Eyebrow from "../ui/Eyebrow";
import { BASE_URL } from "../utils/config";

// FAQ accordion, driven by the knowledge corpus (the SAME chunks the concierge
// cites) so the page and the AI never disagree. Falls back to a small built-in set
// if the corpus is empty / unreachable, so tour pages never render an empty block.
//
// Props:
//   limit, show only the first N (TourDetails uses a teaser); omit for all.
//   viewAll, show an "All questions ->" link to /faq (for the teaser).
//   anchors, give each item id={chunk._id} so concierge citations can deep-link.

const FALLBACK = [
  { id: "fb-1", q: "How early should I book my journey?", a: "For peak season (October-March) we recommend confirming dates 4-6 months ahead. For festival-period travel (Diwali, Pushkar, Holi) earlier is better still, heritage rooms and scholar-guides book out first." },
  { id: "fb-2", q: "Can I customise an existing itinerary?", a: "Yes, every published itinerary is a starting point. Tell us your dates, the pace you like and what you want to skip, and we rewrite it around you." },
  { id: "fb-3", q: "Which payment methods do you accept?", a: "Bank transfer (domestic and international wire), all major credit and debit cards, and UPI for Indian residents. We never charge until you've confirmed the final itinerary." },
  { id: "fb-4", q: "Do you arrange flights, trains and permits?", a: "Flights and trains to your start city we advise on but don't ticket, you book direct and we shape the itinerary around your arrival. Where a journey needs an Inner Line Permit (Ladakh's high valleys, parts of the North-East), we arrange it for you." },
];

const FAQ = ({ limit, viewAll = false, anchors = false, showHeader = true }) => {
  const [items, setItems] = useState(null); // null = loading
  const [open, setOpen] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    axios
      .get(`${BASE_URL}/knowledge`, { params: { category: "faq" } })
      .then((res) => {
        if (!alive) return;
        const data = res.data?.data || [];
        setItems(data.length ? data.map((d) => ({ id: d._id, q: d.title, a: d.body })) : FALLBACK);
      })
      .catch(() => alive && setItems(FALLBACK));
    return () => {
      alive = false;
    };
  }, []);

  const all = items || FALLBACK;
  const shown = limit ? all.slice(0, limit) : all;

  // Deep-link support: a citation to /faq#<id> opens + scrolls to that question -
  // on first load AND when the hash changes while already on the page.
  useEffect(() => {
    if (!anchors || !items) return;
    const hash = decodeURIComponent((location.hash || "").replace("#", ""));
    if (!hash) return;
    const idx = shown.findIndex((f) => String(f.id) === hash);
    if (idx >= 0) {
      setOpen(idx);
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, anchors, location.hash]);

  return (
    <section className="bg-brand-cream ds-section">
      <div className="ds-container max-w-3xl">
        {showHeader && (
          <div className="text-center mb-12">
            <Eyebrow>Before you ask</Eyebrow>
            <h2 className="ds-h2 mt-4 text-balance">Frequently asked</h2>
          </div>
        )}

        <div className="space-y-3">
          {shown.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.id || i}
                id={anchors ? String(f.id) : undefined}
                className={`ds-card transition-colors scroll-mt-28 ${isOpen ? "border-brand-gold/60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-6 text-left p-5 md:p-6"
                >
                  <span className="font-heading text-brand-espresso text-lg md:text-xl pr-4">{f.q}</span>
                  <i className={`ri-arrow-down-s-line text-2xl text-brand-gold-dark shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-5 md:px-6 pb-6 -mt-1">
                    <p className="ds-body text-brand-muted text-pretty whitespace-pre-wrap">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {viewAll && (
          <div className="text-center mt-8">
            <Link to="/faq" className="ds-btn ds-btn-link">
              All questions <i className="ri-arrow-right-line" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FAQ;
