import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import SafeImage from "../ui/SafeImage";
import { useCurrency } from "../context/CurrencyContext";
import { BASE_URL } from "../utils/config";
import { groupBySource, REGION_IMAGE } from "../utils/knowledge";
import { regionLabel } from "../utils/regions";

// /guides/:slug, one destination or seasonal guide, reconstructed from its corpus
// chunks. Region guides get a photo hero (from the region's tours) and show those
// journeys; seasonal guides are text. Section headings drop the "<Region>- " prefix
// the seed added. Each section is anchored so concierge citations deep-link to it.

const TourMini = ({ tour, format }) => (
  <Link to={`/tours/${tour._id}`} className="group ds-card ds-card-hover flex items-stretch overflow-hidden">
    <div className="w-24 shrink-0 self-stretch bg-brand-line overflow-hidden">
      <SafeImage src={tour.photo} alt={tour.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
    </div>
    <div className="flex-1 min-w-0 p-4 flex flex-col justify-center gap-1">
      <div className="flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-[0.1em] text-brand-muted">
        {tour.city && <span className="inline-flex items-center gap-1 truncate"><i className="ri-map-pin-2-line text-brand-gold" />{tour.city}</span>}
        {tour.duration ? <span className="inline-flex items-center gap-1"><i className="ri-calendar-line" />{tour.duration}d</span> : null}
      </div>
      <h4 className="font-heading text-brand-espresso text-sm leading-snug line-clamp-2 group-hover:text-brand-gold-dark transition-colors">{tour.title}</h4>
      {tour.price > 0 && <p className="font-heading text-brand-espresso text-sm">{format(tour.price)}<span className="text-[10px] text-brand-muted ml-1 font-body">/ person</span></p>}
    </div>
  </Link>
);

const GuideDetail = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { format } = useCurrency();
  const [chunks, setChunks] = useState(null);
  const [tours, setTours] = useState([]);

  useEffect(() => {
    let alive = true;
    // scope:all so a concierge citation to any chunk (incl. the retrieval-only
    // "deep" layer) still resolves here, this page renders ONLY the slug-matched
    // article, so it never resurfaces the hidden guides as a grid.
    axios
      .get(`${BASE_URL}/knowledge`, { params: { scope: "all" } })
      .then((res) => alive && setChunks(res.data?.data || []))
      .catch(() => alive && setChunks([]));
    return () => {
      alive = false;
    };
  }, []);

  const guides = groupBySource((chunks || []).filter((c) => c.category === "region-guide" || c.category === "guide"));
  const guide = guides.find((g) => g.slug === slug);
  const region = guide?.region || "";
  // This region's travel-permit chunks (knowledge corpus, category "permit").
  const permits = (chunks || []).filter((c) => c.category === "permit" && c.region === region);

  // Pull the region's real journeys for the hero image + the cards at the bottom.
  useEffect(() => {
    if (!region) return;
    let alive = true;
    axios
      .get(`${BASE_URL}/tours/region/${region}`)
      .then((res) => alive && setTours(res.data?.data || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [region]);

  // Deep-link: scroll on load and on hash change (same-page citation clicks).
  useEffect(() => {
    if (!guide) return;
    const hash = decodeURIComponent((location.hash || "").replace("#", ""));
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [guide, location.hash]);

  if (chunks === null) {
    return (
      <div className="bg-brand-cream min-h-[60vh] flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!guide) {
    return (
      <section className="bg-brand-cream pt-28 pb-24 text-center">
        <div className="ds-container max-w-3xl">
          <h1 className="ds-h2">Guide not found</h1>
          <Link to="/guides" className="ds-btn ds-btn-link mt-4 inline-flex"><i className="ri-arrow-left-line" /> All guides</Link>
        </div>
      </section>
    );
  }

  const isRegion = Boolean(region);
  const title = isRegion ? regionLabel(region) : guide.sourceTitle;
  const heroPhoto = isRegion ? REGION_IMAGE[region] || tours[0]?.photo : null;
  const cleanHeading = (t) => (t.includes("-") ? t.split("-").slice(1).join("-") : t);

  return (
    <>
      {heroPhoto ? (
        <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
          <SafeImage src={heroPhoto} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/85 via-brand-espresso/35 to-brand-espresso/10" />
          <div className="relative ds-container max-w-3xl pb-8">
            <span className="text-xs uppercase tracking-[0.18em] text-brand-gold">Destination guide</span>
            <h1 className="ds-h1 text-brand-cream mt-2 text-balance">{title}</h1>
          </div>
        </section>
      ) : null}

      <section className={`bg-brand-cream pb-20 ${heroPhoto ? "pt-8" : "pt-24 md:pt-28"}`}>
        <div className="ds-container max-w-3xl">
          <Link to="/guides" className="ds-btn ds-btn-link mb-6 inline-flex">
            <i className="ri-arrow-left-line" /> All guides
          </Link>

          {!heroPhoto && (
            <div className="mb-8">
              <span className="text-xs uppercase tracking-[0.18em] text-brand-gold-dark">{isRegion ? "Destination guide" : "Travel guide"}</span>
              <h1 className="ds-h1 mt-2 text-balance">{title}</h1>
              <div className="w-12 h-px bg-brand-gold/50 mt-4" />
            </div>
          )}

          <div className="space-y-10">
            {guide.sections.map((s) => (
              <div key={s._id} id={String(s._id)} className="scroll-mt-28">
                <h2 className="font-heading text-brand-espresso text-xl md:text-2xl">{cleanHeading(s.title)}</h2>
                <div className="w-10 h-px bg-brand-gold/50 mt-3 mb-4" />
                <p className="ds-body text-brand-muted text-pretty whitespace-pre-wrap">{s.body}</p>
              </div>
            ))}
          </div>

          {isRegion && permits.length > 0 && (
            <div className="mt-14">
              <h2 className="font-heading text-brand-espresso text-xl md:text-2xl flex items-center gap-2.5">
                <i className="ri-shield-star-line text-brand-gold-dark" /> Travel permits
              </h2>
              <div className="w-10 h-px bg-brand-gold/50 mt-3 mb-5" />
              <div className="space-y-6">
                {permits.map((p) => (
                  <div key={p._id} id={String(p._id)} className="scroll-mt-28">
                    <h3 className="font-heading text-brand-espresso text-lg">{cleanHeading(p.title)}</h3>
                    <p className="ds-body text-brand-muted text-pretty whitespace-pre-wrap mt-2">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isRegion && tours.length > 0 && (
            <div className="mt-16">
              <h2 className="ds-h4 mb-1">Our {title} journeys</h2>
              <p className="ds-small text-brand-muted mb-6">Private, guided itineraries, each re-shaped around you.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {tours.slice(0, 4).map((t) => (
                  <TourMini key={t._id} tour={t} format={format} />
                ))}
              </div>
              {tours.length > 4 && (
                <div className="mt-6">
                  <Link to={`/tours/region/${region}`} className="ds-btn ds-btn-link">
                    See all {title} journeys <i className="ri-arrow-right-line" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default GuideDetail;
