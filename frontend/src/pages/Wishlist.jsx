import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { useWishlist } from "../context/WishlistContext";
import { useCurrency } from "../context/CurrencyContext";
import SafeImage from "../ui/SafeImage";
import Button from "../ui/Button";
import Eyebrow from "../ui/Eyebrow";
import GoldRule from "../ui/GoldRule";
import PageHero from "../ui/PageHero";

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 },
  }),
};

const Wishlist = () => {
  const { items, remove, clear } = useWishlist();
  const { format } = useCurrency();

  return (
    <>
      <PageHero
        eyebrow="Wishlist"
        title="Journeys you've kept aside."
        lead="Saved to this device. We don't need an account from you yet, when you're ready to talk dates, we'll pick up exactly here."
      />

      <section className="bg-brand-cream ds-section">
        <div className="ds-container">
          {items.length === 0 ? (
            <div className="max-w-xl mx-auto text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center mb-6">
                <i className="ri-heart-3-line text-[26px]" />
              </div>
              <Eyebrow>Nothing saved yet</Eyebrow>
              <h2 className="ds-h3 mt-3 text-balance">
                A wishlist is a quiet way to start.
              </h2>
              <GoldRule />
              <p className="ds-lead mt-2 text-pretty">
                Tap the heart on any journey to keep it here. Save three, send
                them to us, and we'll tell you which one fits the season.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                <Button to="/tours" variant="primary" size="lg">
                  Browse journeys
                </Button>
                <Button to="/plan" variant="ghost" size="lg">
                  Plan from scratch
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-10">
                <p className="ds-small">
                  {items.length} {items.length === 1 ? "journey" : "journeys"} kept aside
                </p>
                <button
                  type="button"
                  onClick={clear}
                  className="ds-btn ds-btn-link text-sm"
                >
                  Clear all
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence initial={false}>
                  {items.map((tour, i) => (
                    <motion.article
                      key={tour._id}
                      layout
                      variants={item}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
                      custom={i}
                      className="ds-card ds-card-hover flex flex-col relative group"
                    >
                      <button
                        type="button"
                        onClick={() => remove(tour._id)}
                        aria-label="Remove from wishlist"
                        className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-brand-parchment/85 backdrop-blur-sm border border-brand-line text-brand-muted hover:text-brand-terracotta hover:border-brand-terracotta/60 flex items-center justify-center transition-colors"
                      >
                        <i className="ri-close-line text-[15px]" />
                      </button>

                      <Link to={`/tours/${tour._id}`} className="block overflow-hidden">
                        <div className="aspect-[4/3]">
                          <SafeImage
                            src={tour.photo}
                            alt={tour.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                      </Link>

                      <div className="p-6 flex flex-col flex-1">
                        {tour.city && (
                          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-brand-muted mb-2">
                            <i className="ri-map-pin-2-line text-brand-gold" />
                            {tour.city}
                          </span>
                        )}
                        <h3 className="ds-h4 mb-3">
                          <Link to={`/tours/${tour._id}`} className="hover:text-brand-gold-dark transition-colors">
                            {tour.title}
                          </Link>
                        </h3>
                        {tour.duration && (
                          <p className="text-sm text-brand-muted mb-4">
                            <i className="ri-calendar-line mr-1.5" /> {tour.duration} days
                          </p>
                        )}
                        <div className="mt-auto pt-5 border-t border-brand-line flex items-center justify-between">
                          {tour.price > 0 ? (
                            <div className="leading-tight">
                              <span className="block text-[10px] uppercase tracking-[0.12em] text-brand-muted">From</span>
                              <span className="font-heading text-lg text-brand-espresso">
                                {format(tour.price)}
                              </span>
                            </div>
                          ) : <span />}
                          <Link
                            to={`/tours/${tour._id}`}
                            className="ds-btn ds-btn-ghost ds-btn-sm"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-16 ds-card p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <Eyebrow>Ready to make it real?</Eyebrow>
                  <h3 className="ds-h3 mt-2 text-balance">
                    Send your shortlist over. We'll tell you what to do with it.
                  </h3>
                </div>
                <Button to="/contact" variant="primary" size="lg">
                  Begin the conversation
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default Wishlist;
