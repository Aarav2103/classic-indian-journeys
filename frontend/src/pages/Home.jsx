import React from "react";
import { Link } from "react-router-dom";

import FeaturedToursList from "../components/FeaturedTours/FeaturedToursList";
import Testimonials from "../components/Testimonials/Testimonials";
import RoyalCarousel from "../components/Image-gallery/RoyalCarousel";
import Newsletter from "../shared/Newsletter";
import CinematicHero from "../components/Hero/CinematicHero";
import Reveal from "../components/Motion/Reveal";
import Button from "../ui/Button";
import Eyebrow from "../ui/Eyebrow";
import GoldRule from "../ui/GoldRule";

const Home = () => {
  return (
    <>
      <CinematicHero />

      {/* EDITORIAL PULL QUOTE: opening epigraph */}
      <section className="bg-brand-cream py-24 md:py-32">
        <div className="ds-container">
          <Reveal>
            <p className="ds-pullquote">
              The point of India is not to see it quickly.
              <br />
              <span className="text-brand-gold-dark">It is to be unhurried in it.</span>
              <cite>- A note we keep on the office wall</cite>
            </p>
          </Reveal>
        </div>
      </section>

      {/* featured journeys */}
      <section className="bg-brand-parchment ds-section">
        <div className="ds-container">
          <Reveal>
            <div className="max-w-2xl mx-auto text-center mb-16">
              <Eyebrow>Featured itineraries</Eyebrow>
              <h2 className="ds-h2 mt-4 text-balance">
                Hand-drawn routes across the subcontinent
              </h2>
              <GoldRule />
              <p className="ds-lead text-pretty">
                A short selection from our current itineraries. Each is a
                starting point, every journey we run is re-shaped around the
                people taking it.
              </p>
            </div>
          </Reveal>
          <FeaturedToursList />
        </div>
      </section>

      {/* destinations / gallery */}
      <section className="bg-brand-cream ds-section">
        <div className="ds-container">
          <Reveal>
            <div className="max-w-2xl mx-auto text-center mb-16">
              <Eyebrow>Where we travel</Eyebrow>
              <h2 className="ds-h2 mt-4 text-balance">A glimpse of India.</h2>
              <GoldRule />
              <p className="ds-lead text-pretty">
                Palaces, ghats, forts and forests, a visual prelude to the
                India we will show you.
              </p>
            </div>
          </Reveal>
          <RoyalCarousel />
        </div>
      </section>

      {/* middle pull quote */}
      <section className="bg-brand-parchment py-24 md:py-32">
        <div className="ds-container">
          <Reveal>
            <p className="ds-pullquote">
              "A good itinerary doesn't pack a place into a day.
              It clears a day for the place."
              <cite>- Our rule no. 4</cite>
            </p>
          </Reveal>
        </div>
      </section>

      {/* testimonials */}
      <section className="bg-brand-cream ds-section">
        <div className="ds-container">
          <Reveal>
            <div className="max-w-2xl mx-auto text-center mb-16">
              <Eyebrow>From our travellers</Eyebrow>
              <h2 className="ds-h2 mt-4 text-balance">
                Quiet words from the people we have hosted.
              </h2>
              <GoldRule />
            </div>
          </Reveal>
          <Testimonials />
        </div>
      </section>

      {/* travel guides */}
      <section className="bg-brand-parchment ds-section">
        <div className="ds-container">
          <Reveal>
            <div className="max-w-2xl mx-auto text-center">
              <Eyebrow>Travel guides</Eyebrow>
              <h2 className="ds-h2 mt-4 text-balance">
                Know India before you go.
              </h2>
              <GoldRule />
              <p className="ds-lead text-pretty">
                When to travel where, what each region is really like, and how to think
                about seasons, wildlife and pace, written by us, grounded in the
                journeys we run.
              </p>
              <div className="mt-8">
                <Button to="/guides" variant="primary" size="lg">
                  Read our guides
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* final cta */}
      <section className="bg-brand-cream ds-section-sm">
        <div className="ds-container">
          <Reveal>
            <div className="ds-card overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="relative min-h-[280px] md:min-h-[420px]">
                  <img
                    src="/hero-palace.webp"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-brand-espresso/10" />
                </div>
                <div className="p-10 md:p-14 flex flex-col justify-center">
                  <Eyebrow>Begin the conversation</Eyebrow>
                  <h2 className="ds-h2 mt-4 text-balance">
                    Tell us what kind of India you want to see.
                  </h2>
                  <p className="ds-body mt-5 text-brand-muted text-pretty">
                    A long conversation up front, what you want, what you want
                    to avoid, who you are travelling with. We reply within a
                    working day, every time.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Button to="/plan" variant="primary" size="lg">
                      Plan my journey
                    </Button>
                    <Link to="/tours" className="ds-btn ds-btn-link self-center">
                      Browse itineraries first
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Newsletter />
    </>
  );
};

export default Home;
