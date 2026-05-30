import React, { useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import DustMotes from "../Atmosphere/DustMotes";

const HEADLINE = ["India,", "told", "well", "and", "travelled", "slowly."];

const wordContainer = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.35,
      staggerChildren: 0.09,
    },
  },
};

const wordItem = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const CinematicHero = () => {
  const sectionRef = useRef(null);
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submitSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (query.length >= 2) navigate(`/tours?ai=${encodeURIComponent(query)}`);
  };

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Smooth the raw scroll progress so the scroll-linked transforms glide between
  // scroll events instead of snapping frame-to-frame (the cause of the jank).
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
    restDelta: 0.001,
  });

  // Parallax: image drifts up slowly, overlay deepens, headline lifts subtly.
  const imageY = useTransform(progress, [0, 1], ["0%", "18%"]);
  const imageScale = useTransform(progress, [0, 1], [1, 1.08]);
  const overlayOpacity = useTransform(progress, [0, 0.6, 1], [0.55, 0.78, 0.92]);
  const contentY = useTransform(progress, [0, 1], ["0%", "-12%"]);
  const contentOpacity = useTransform(progress, [0, 0.6, 1], [1, 0.7, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[92vh] min-h-[640px] w-full overflow-hidden"
    >
      {/* image layer w/ parallax + Ken Burns */}
      <motion.div
        style={reduce ? undefined : { y: imageY, scale: imageScale }}
        className="absolute inset-0 will-change-transform"
      >
        <img
          src="/hero-palace.webp"
          alt="A heritage Indian palace at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
          // Static overscan (replaces the old kenBurns animation) keeps the frame
          // covered during the parallax drift; translateZ(0) puts the image on its
          // own GPU layer so the parent's scroll-scale composites cleanly.
          style={{ transform: "scale(1.05) translateZ(0)", backfaceVisibility: "hidden" }}
          fetchPriority="high"
        />
      </motion.div>

      {/* graded overlay */}
      <motion.div
        style={reduce ? undefined : { opacity: overlayOpacity }}
        className="absolute inset-0 bg-gradient-to-b from-[#1a0f06]/30 via-[#1a0f06]/45 to-[#1a0f06]/85"
      />

      {/* soft vignette + warm wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 60%, transparent 0%, rgba(0,0,0,0.45) 100%), linear-gradient(180deg, rgba(201,162,74,0.06) 0%, transparent 35%)",
        }}
      />

      {/* dust motes */}
      <DustMotes density={48} />

      {/* content, vertically centered headline, subtitle and CTAs */}
      <motion.div
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 h-full flex flex-col items-center text-center px-5 pt-24 md:pt-28 pb-8 md:pb-10"
      >
        <div className="flex-1 w-full flex flex-col items-center justify-center">
          <motion.p
            initial={{ opacity: 0, y: 12, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.32em" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="text-[0.7rem] md:text-xs uppercase text-[#E6CE91]/90 font-medium mb-7 md:mb-8"
          >
            Classic Indian Journeys · Est. with intent
          </motion.p>

          <motion.h1
            variants={wordContainer}
            initial="hidden"
            animate="visible"
            className="font-heading text-balance text-[#FFFBF3] text-[clamp(2.4rem,6vw,5rem)] leading-[1.05] max-w-5xl font-medium"
          >
            {HEADLINE.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                variants={wordItem}
                className="inline-block mr-[0.28em] last:mr-0"
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* gold rule animates in after headline */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.9 }}
            style={{ transformOrigin: "center" }}
            className="mt-8 md:mt-10 h-px w-40 bg-gradient-to-r from-transparent via-[#E6CE91] to-transparent"
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 1.05 }}
            className="mt-6 md:mt-8 max-w-xl text-[#FFFBF3]/90 text-[1rem] md:text-lg leading-relaxed"
          >
            Bespoke journeys through India's palaces, ghats, forts and backwaters
, designed by people who know the country in detail.
          </motion.p>

          {/* AI smart box, the primary entry. Routes to /tours, which auto-runs
              the query (search or full itinerary, decided server-side). */}
          <motion.form
            onSubmit={submitSearch}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 1.15 }}
            className="mt-9 md:mt-10 w-full max-w-[33rem] relative"
          >
            <i className="ri-sparkling-2-fill absolute left-5 top-1/2 -translate-y-1/2 text-brand-gold-dark" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a tour or plan a whole trip"
              aria-label="Describe your trip or search our journeys"
              maxLength={300}
              className="w-full rounded-full bg-[#FFFBF3]/95 backdrop-blur pl-12 pr-[8.5rem] py-[1.05rem] text-brand-espresso placeholder:text-brand-muted text-[0.95rem] border border-[#FFFBF3]/50 focus:outline-none focus:ring-2 focus:ring-[#E6CE91] shadow-card"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full bg-brand-espresso text-brand-parchment px-5 py-2.5 text-[0.72rem] uppercase tracking-[0.16em] font-medium hover:bg-brand-gold-dark transition-colors"
            >
              <i className="ri-sparkling-line" /> Ask AI
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 1.3 }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[33rem]"
          >
            <Link
              to="/tours"
              className="w-full inline-flex items-center justify-center px-6 py-[1.05rem] rounded-full border border-[#FFFBF3]/40 text-[#FFFBF3] text-[0.72rem] uppercase tracking-[0.16em] whitespace-nowrap font-medium transition-all duration-300 hover:bg-[#E6CE91]/15 hover:border-[#E6CE91]/80 hover:text-[#F2E2B6] hover:-translate-y-0.5"
            >
              Discover our journeys
            </Link>
            <Link
              to="/plan"
              className="w-full inline-flex items-center justify-center px-6 py-[1.05rem] rounded-full border border-[#FFFBF3]/40 text-[#FFFBF3] text-[0.72rem] uppercase tracking-[0.16em] whitespace-nowrap font-medium transition-all duration-300 hover:bg-[#FFFBF3]/10 hover:border-[#FFFBF3]/70 hover:-translate-y-0.5"
            >
              Plan your journey
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default CinematicHero;
