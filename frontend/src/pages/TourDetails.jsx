import React, { useState, useRef, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

import useFetch from "../hooks/useFetch";
import { AuthContext } from "../context/AuthContext";

import Booking from "../components/Booking/Booking";
import ReviewInsights from "../components/reviews/ReviewInsights";
import TourFinePrint from "../components/Tours/TourFinePrint";
import FAQ from "../shared/FAQ";
import SafeImage from "../ui/SafeImage";
import Button from "../ui/Button";
import { Textarea } from "../ui/Input";
import Alert from "../ui/Alert";
import Monogram from "../ui/Monogram";
import Eyebrow from "../ui/Eyebrow";

const DATE_FMT = { day: "numeric", month: "long", year: "numeric" };

const StarRating = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5">
    {[1, 2, 3, 4, 5].map((v) => (
      <button
        type="button"
        key={v}
        onClick={() => onChange(v)}
        aria-label={`Rate ${v} star${v === 1 ? "" : "s"}`}
        className={`p-1.5 transition-transform hover:scale-110 ${
          value && v <= value ? "text-brand-gold" : "text-brand-line"
        }`}
      >
        <i className="ri-star-fill text-xl" />
      </button>
    ))}
  </div>
);

const KeyFact = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="w-11 h-11 shrink-0 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center">
      <i className={`${icon} text-xl`} />
    </div>
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-brand-muted mb-0.5">
        {label}
      </p>
      <p className="text-brand-espresso font-medium">{value || "-"}</p>
    </div>
  </div>
);

const TourDetails = () => {
  const { id } = useParams();
  const reviewMsgRef = useRef(null);
  const [tourRating, setTourRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const { user } = useContext(AuthContext);

  const { data: tour, loading: loadingTour, error: errorTour } = useFetch(`tours/${id}`);
  const { data: fetchedReviews, loading: loadingReviews } = useFetch(`review/${id}/`);

  useEffect(() => {
    if (fetchedReviews) setReviews(fetchedReviews);
  }, [fetchedReviews]);

  if (loadingTour || loadingReviews) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center bg-brand-cream">
        <div className="w-10 h-10 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="ds-small">Retrieving journey details...</p>
      </div>
    );
  }

  if (errorTour || !tour) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-brand-cream px-4 text-center">
        <p className="ds-lead">Unable to load this journey right now.</p>
      </div>
    );
  }

  const {
    photo,
    title,
    desc,
    city,
    distance,
    address,
    maxGroupSize,
    duration,
    avgRating = 0,
    reviewCount = 0,
    overview = "",
    highlights = [],
    bestMonths = [],
    tags = [],
    itinerary = [],
  } = tour;

  const season = bestMonths.length ? bestMonths.map((m) => m.slice(0, 3)).join(" · ") : "Year-round";

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { setStatus("login"); return; }
    if (!tourRating) { setStatus("no-rating"); return; }

    try {
      const res = await api.post(`/review/${id}`, {
        rating: tourRating,
        reviewText: reviewMsgRef.current.value,
      });
      const created = res.data?.data ?? res.data;
      setReviews((prev) => [created, ...prev]);
      reviewMsgRef.current.value = "";
      setTourRating(null);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      {/* hero */}
      <section className="relative h-[55vh] min-h-[420px] w-full overflow-hidden">
        <SafeImage
          src={photo}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/85 via-brand-espresso/40 to-brand-espresso/10" />
        <div className="relative z-10 h-full flex items-end">
          <div className="ds-container pb-12 md:pb-16">
            <Eyebrow className="!text-brand-gold-light">{city}</Eyebrow>
            <h1 className="ds-h1 !text-brand-parchment mt-3 max-w-3xl text-balance">
              {title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-brand-parchment/85 text-sm">
              {reviewCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-star-fill text-brand-gold" />
                  {avgRating} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </span>
              )}
              {address && (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-map-pin-2-line text-brand-gold" />
                  {address}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* body */}
      <section className="bg-brand-cream ds-section">
        <div className="ds-container">
          <div className="grid lg:grid-cols-3 gap-10 lg:gap-14 items-start">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-12">
              {/* Key facts */}
              <div className="ds-card p-7 md:p-8">
                <div className="grid sm:grid-cols-2 gap-7">
                  <KeyFact
                    icon="ri-calendar-line"
                    label="Duration"
                    value={duration ? `${duration} days` : null}
                  />
                  <KeyFact
                    icon="ri-group-line"
                    label="Group size"
                    value={maxGroupSize ? `Up to ${maxGroupSize}` : null}
                  />
                  <KeyFact
                    icon="ri-road-map-line"
                    label="Coverage"
                    value={distance ? `${distance} km` : null}
                  />
                  <KeyFact
                    icon="ri-sun-line"
                    label="Best season"
                    value={season}
                  />
                </div>
              </div>

              {/* Overview */}
              <div className="prose-section">
                <Eyebrow>Overview</Eyebrow>
                <h2 className="ds-h3 mt-3 mb-6 text-balance">About this journey</h2>
                <div className="ds-body text-brand-ink space-y-5 leading-relaxed">
                  {(overview || desc || "").split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
                </div>
                {tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-parchment border border-brand-line px-3 py-1 text-xs text-brand-espresso capitalize"
                      >
                        <i className="ri-price-tag-3-line text-brand-gold-dark" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Highlights */}
              {highlights.length > 0 && (
                <div>
                  <Eyebrow>Highlights</Eyebrow>
                  <h2 className="ds-h3 mt-3 mb-6">What stays with you</h2>
                  <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3 ds-body text-brand-ink">
                        <i className="ri-sparkling-2-fill text-brand-gold-dark mt-1 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Day by day */}
              {itinerary.length > 0 && (() => {
                const DAYS_PREVIEW = 4;
                // Only collapse when it's meaningfully longer than the preview.
                const collapsible = itinerary.length > DAYS_PREVIEW + 1;
                const days = collapsible && !showAllDays ? itinerary.slice(0, DAYS_PREVIEW) : itinerary;
                const hiddenCount = itinerary.length - DAYS_PREVIEW;
                return (
                  <div>
                    <Eyebrow>Day by day</Eyebrow>
                    <h2 className="ds-h3 mt-3 mb-6">The route, unhurried</h2>
                    <div className="relative">
                      <ol className="relative border-l-2 border-brand-gold/30 ml-3 space-y-1">
                        {days.map((d, i) => (
                          <li key={i} className="relative pl-7 py-4">
                            <span className="absolute -left-[11px] top-5 w-5 h-5 rounded-full bg-brand-cream border-2 border-brand-gold flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                            </span>
                            <div className="flex items-baseline gap-3">
                              <span className="font-heading text-xl text-brand-gold-dark">{String(d.day).padStart(2, "0")}</span>
                              <h4 className="font-heading text-brand-espresso text-lg">{d.title}</h4>
                            </div>
                            {d.detail && <p className="ds-body mt-1 text-brand-muted">{d.detail}</p>}
                          </li>
                        ))}
                      </ol>
                      {/* Fade the cut-off edge when collapsed. */}
                      {collapsible && !showAllDays && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-brand-cream to-transparent" />
                      )}
                    </div>
                    {collapsible && (
                      <button
                        type="button"
                        onClick={() => setShowAllDays((v) => !v)}
                        className="ds-btn ds-btn-ghost ds-btn-sm mt-6"
                      >
                        <i className={`ri-arrow-down-s-line transition-transform ${showAllDays ? "rotate-180" : ""}`} />
                        {showAllDays ? "Show fewer days" : `Show all ${itinerary.length} days (+${hiddenCount})`}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* What's included / good to know (tour-info + permit corpus) */}
              <TourFinePrint tourId={id} />

              {/* Reviews */}
              <div>
                <Eyebrow>Guest impressions</Eyebrow>
                <h2 className="ds-h3 mt-3 mb-6">
                  {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </h2>

                {/* AI-synthesised review intelligence (cached on the tour). */}
                {tour.reviewInsights && (
                  <div className="mb-8">
                    <ReviewInsights insights={tour.reviewInsights} />
                  </div>
                )}

                {status === "success" && <Alert tone="success" className="mb-4">Thank you, your review has been posted.</Alert>}
                {status === "error" && <Alert tone="error" onClose={() => setStatus(null)} className="mb-4">Could not post your review. Please try again.</Alert>}
                {status === "login" && <Alert tone="warning" onClose={() => setStatus(null)} className="mb-4">Please log in to leave a review.</Alert>}
                {status === "no-rating" && <Alert tone="warning" onClose={() => setStatus(null)} className="mb-4">Pick a star rating first.</Alert>}

                <form onSubmit={submitReview} className="ds-card p-7 md:p-8 space-y-5">
                  <div>
                    <label className="ds-label">Your rating</label>
                    <StarRating value={tourRating} onChange={setTourRating} />
                  </div>
                  <Textarea
                    ref={reviewMsgRef}
                    label="Share your thoughts"
                    name="reviewText"
                    required
                    placeholder="What did you like? What would you tell another traveller?"
                  />
                  <Button type="submit" variant="primary">
                    Submit review
                  </Button>
                </form>

                <div className="mt-8 space-y-5">
                  {reviews.length === 0 ? (
                    <p className="ds-small">No reviews yet. Be the first to share your impressions.</p>
                  ) : (
                    reviews.map((r, i) => (
                      <article key={i} className="ds-card p-6 md:p-7 flex gap-5">
                        <Monogram name={r.username} size={48} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="font-heading text-brand-espresso text-lg">
                              {r.username}
                            </h4>
                            {r.rating && (
                              <span className="text-sm text-brand-muted">
                                <i className="ri-star-fill text-brand-gold mr-1" />
                                {r.rating}
                              </span>
                            )}
                          </div>
                          <p className="ds-small mb-3">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", DATE_FMT)}
                          </p>
                          <p className="ds-body">{r.reviewText}</p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right column, Booking */}
            <div className="lg:col-span-1">
              <Booking tour={tour} avgRating={avgRating} reviewCount={reviewCount} />
            </div>
          </div>
        </div>
      </section>

      <FAQ limit={6} viewAll tour={id} anchors />
    </>
  );
};

export default TourDetails;
