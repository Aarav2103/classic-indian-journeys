import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SafeImage from "../ui/SafeImage";
import { useCurrency } from "../context/CurrencyContext";
import { useWishlist } from "../context/WishlistContext";

// The one or two aspects guests most consistently praised, from the cached
// review-intelligence rollup. Strong, well-evidenced signal only (kept subtle).
const PRAISE_LABELS = { guide: "guides", itinerary: "the itinerary", value: "value", comfort: "comfort", hospitality: "hospitality", food: "the food", pace: "the pace", organisation: "the planning" };
const topPraise = (insights) =>
  (insights?.aspects || [])
    .filter((a) => (a.score || 0) >= 75 && (a.mentions || 0) >= 2)
    .slice(0, 2)
    .map((a) => PRAISE_LABELS[a.aspect] || a.aspect);

const TourCard = ({ tour, index = 0 }) => {
  const { _id, title, city, photo, price, avgRating, reviewCount, duration, featured, reviewInsights } = tour || {};
  const { format } = useCurrency();
  const { has, toggle } = useWishlist();
  const saved = has(_id);
  const praise = topPraise(reviewInsights);

  const handleHeart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(tour);
  };

  return (
    <article className="ds-card ds-card-hover h-full flex flex-col group relative">
      {/* Wishlist heart, absolute over image */}
      <button
        type="button"
        onClick={handleHeart}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={saved}
        className="absolute top-3.5 right-3.5 z-10 w-10 h-10 rounded-full bg-brand-parchment/85 backdrop-blur-sm border border-brand-line text-brand-espresso flex items-center justify-center hover:bg-brand-parchment hover:border-brand-gold/70 transition-colors"
      >
        <motion.span
          key={saved ? "on" : "off"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={saved ? "text-brand-gold-dark" : "text-brand-muted"}
        >
          <i className={`${saved ? "ri-heart-3-fill" : "ri-heart-3-line"} text-[17px]`} />
        </motion.span>
      </button>

      <Link to={`/tours/${_id}`} className="relative block overflow-hidden">
        <div className="aspect-[4/3]">
          <SafeImage
            src={photo}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        {featured && (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-brand-espresso/90 text-brand-parchment text-[11px] uppercase tracking-[0.16em] px-3 py-1.5">
            <i className="ri-sparkling-line text-brand-gold text-sm" />
            Featured
          </span>
        )}
      </Link>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-3 mb-3">
          {city && (
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-brand-muted">
              <i className="ri-map-pin-2-line text-brand-gold" />
              {city}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
            <i className="ri-star-fill text-brand-gold" />
            {reviewCount > 0 ? (
              <>
                {avgRating} <span className="opacity-60">({reviewCount})</span>
              </>
            ) : (
              <span className="opacity-60">New</span>
            )}
          </span>
        </div>

        <h3 className="ds-h4 mb-3">
          <Link to={`/tours/${_id}`} className="hover:text-brand-gold-dark transition-colors">
            {title}
          </Link>
        </h3>

        {duration && (
          <p className="text-sm text-brand-muted mb-2">
            <i className="ri-calendar-line mr-1.5" /> {duration} days
          </p>
        )}

        {praise.length > 0 && (
          <p className="text-xs text-brand-gold-dark/90 mb-5 inline-flex items-center gap-1.5">
            <i className="ri-sparkling-2-line" />
            <span className="text-brand-muted">Praised for {praise.join(" & ")}</span>
          </p>
        )}

        <div className="mt-auto pt-5 border-t border-brand-line flex items-center justify-between gap-4">
          {price > 0 ? (
            <div className="leading-tight">
              <span className="block text-xs uppercase tracking-[0.12em] text-brand-muted">From</span>
              <span className="font-heading text-xl text-brand-espresso">
                {format(price)}
                <span className="text-sm text-brand-muted ml-1 font-body">/ person</span>
              </span>
            </div>
          ) : <span />}
          <Link
            to={`/tours/${_id}`}
            className="ds-btn ds-btn-ghost ds-btn-sm shrink-0"
          >
            View Journey
            <i className="ri-arrow-right-up-line text-base" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default TourCard;
