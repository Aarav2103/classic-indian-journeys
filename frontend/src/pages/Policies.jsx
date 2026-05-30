import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import Eyebrow from "../ui/Eyebrow";
import Divider from "../ui/Divider";
import { BASE_URL } from "../utils/config";

// /policies, booking policies (deposit, cancellation, amendments, insurance,
// force majeure...), rendered from the knowledge corpus the concierge cites. Each
// clause is anchored by its chunk id so a citation can deep-link straight to it.
const Policies = () => {
  const [items, setItems] = useState(null); // null = loading
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    axios
      .get(`${BASE_URL}/knowledge`, { params: { category: "policy" } })
      .then((res) => alive && setItems(res.data?.data || []))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  // Honour a #<id> deep-link, on first load AND when the hash changes while the
  // page is already mounted (clicking another citation from the concierge).
  useEffect(() => {
    if (!items?.length) return;
    const hash = decodeURIComponent((location.hash || "").replace("#", ""));
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [items, location.hash]);

  return (
    <section className="bg-brand-cream pt-24 md:pt-28 pb-20">
      <div className="ds-container max-w-3xl">
        <div className="text-center">
          <Eyebrow>Booking with us</Eyebrow>
          <h1 className="ds-h1 mt-4 text-balance">Booking policies</h1>
          <Divider className="my-5" />
          <p className="ds-lead text-pretty">
            How deposits, changes, cancellations and cover work, written plainly. If anything's
            unclear, just ask our concierge.
          </p>
        </div>

        {items === null ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="ds-body text-brand-muted text-center py-12">Our policies will be published here shortly.</p>
        ) : (
          <>
            {/* Quick contents */}
            <div className="mt-10 flex flex-wrap gap-2 justify-center">
              {items.map((c) => (
                <a
                  key={c._id}
                  href={`#${c._id}`}
                  className="text-xs text-brand-espresso border border-brand-line hover:border-brand-gold/60 hover:bg-brand-parchment rounded-full px-3 py-1.5 transition-colors"
                >
                  {c.title}
                </a>
              ))}
            </div>

            <div className="mt-12 space-y-12">
              {items.map((c) => (
                <div key={c._id} id={String(c._id)} className="scroll-mt-28">
                  <h2 className="font-heading text-brand-espresso text-xl md:text-2xl">{c.title}</h2>
                  <div className="w-10 h-px bg-brand-gold/50 mt-3 mb-4" />
                  <p className="ds-body text-brand-muted text-pretty whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
            </div>

            <p className="ds-small text-brand-muted mt-16 pt-8 border-t border-brand-line">
              Have a question these don't cover?{" "}
              <Link to="/contact" className="text-brand-gold-dark hover:underline">Talk to our team</Link>- we reply within a working day.
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default Policies;
