import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import Button from "../ui/Button";
import Eyebrow from "../ui/Eyebrow";
import GoldRule from "../ui/GoldRule";

/**
 * A wandering elephant + an old map. Charming, restrained.
 */
const WanderingElephant = ({ reduce }) => (
  <svg
    viewBox="0 0 480 280"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="lost-elephant-title"
    className="w-full max-w-[520px] mx-auto"
    fill="none"
  >
    <title id="lost-elephant-title">An illustrated elephant on a winding map path</title>

    {/* parchment map */}
    <rect x="6" y="6" width="468" height="268" rx="14"
      fill="rgb(var(--brand-parchment-rgb))"
      stroke="rgb(var(--brand-line-rgb))" />

    {/* compass rose */}
    <g transform="translate(420 50)" stroke="rgb(var(--brand-gold-rgb))" strokeWidth="1">
      <circle r="22" fill="none" />
      <circle r="3" fill="rgb(var(--brand-gold-rgb))" />
      <path d="M0 -22 L4 0 L0 22 L-4 0 Z" fill="rgb(var(--brand-gold-rgb) / 0.85)" />
      <path d="M-22 0 L0 4 L22 0 L0 -4 Z" fill="rgb(var(--brand-gold-rgb) / 0.4)" />
      <text y="-28" textAnchor="middle" fontFamily="Playfair Display, serif"
        fontSize="9" fill="rgb(var(--brand-muted-rgb))">N</text>
    </g>

    {/* winding road */}
    <motion.path
      d="M50 230 C 90 200, 110 160, 160 170 S 240 230, 290 170 S 380 90, 420 130"
      stroke="rgb(var(--brand-gold-rgb))"
      strokeWidth="1.4"
      strokeDasharray="3 5"
      strokeLinecap="round"
      initial={reduce ? false : { pathLength: 0 }}
      animate={reduce ? false : { pathLength: 1 }}
      transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
    />

    {/* X marks the spot, but at wrong end */}
    <g transform="translate(48 230)" stroke="rgb(var(--brand-terracotta-rgb))" strokeWidth="1.6">
      <line x1="-5" y1="-5" x2="5" y2="5" />
      <line x1="5" y1="-5" x2="-5" y2="5" />
    </g>
    <text x="60" y="248" fontFamily="Playfair Display, serif" fontStyle="italic"
      fontSize="10" fill="rgb(var(--brand-muted-rgb))">where you meant to go</text>

    {/* meandering hills */}
    <path d="M30 250 Q 70 235, 110 252 T 200 250 T 300 248 T 420 254"
      stroke="rgb(var(--brand-line-rgb))" strokeWidth="1" />

    {/* an elephant, simplified silhouette in gold ink */}
    <motion.g
      transform="translate(370 90)"
      initial={reduce ? false : { x: -300, y: 0 }}
      animate={reduce ? false : { x: 0, y: 0 }}
      transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.g
        animate={reduce ? false : { y: [0, -1.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* body */}
        <path
          d="M2 28
             C 2 14, 14 6, 28 6
             L 50 6
             C 64 6, 74 14, 74 26
             L 74 36
             C 74 42, 70 46, 64 46
             L 62 46
             L 60 56 L 54 56 L 54 48
             L 28 48
             L 28 56 L 22 56 L 22 46
             C 12 46, 2 42, 2 32 Z"
          fill="rgb(var(--brand-espresso-rgb) / 0.82)"
          stroke="rgb(var(--brand-gold-rgb))"
          strokeWidth="1"
        />
        {/* trunk */}
        <path
          d="M2 24 C -6 26, -10 32, -8 40 C -7 44, -3 46, 0 44 C 2 42, 2 38, -1 36"
          fill="rgb(var(--brand-espresso-rgb) / 0.82)"
          stroke="rgb(var(--brand-gold-rgb))"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* eye */}
        <circle cx="12" cy="22" r="1.2" fill="rgb(var(--brand-parchment-rgb))" />
        {/* gold caparison */}
        <path
          d="M30 8 L 60 8 L 58 16 L 32 16 Z"
          fill="rgb(var(--brand-gold-rgb))"
          opacity="0.85"
        />
        <circle cx="44" cy="2" r="2.5" fill="rgb(var(--brand-gold-rgb))" />
      </motion.g>
    </motion.g>

    {/* tiny dots = footprints behind */}
    {[110, 150, 195, 240, 282, 318].map((cx, i) => (
      <motion.circle
        key={cx}
        cx={cx}
        cy={180 + Math.sin(i) * 6}
        r="1.2"
        fill="rgb(var(--brand-gold-rgb) / 0.6)"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? false : { opacity: 1 }}
        transition={{ delay: 0.6 + i * 0.18, duration: 0.4 }}
      />
    ))}

    {/* tiny scribbled label */}
    <text x="240" y="38" textAnchor="middle"
      fontFamily="Playfair Display, serif" fontStyle="italic"
      fontSize="13" fill="rgb(var(--brand-muted-rgb))">
      hic sunt elephantes
    </text>
  </svg>
);

const PageNotFound = () => {
  const reduce = useReducedMotion();
  return (
    <section className="relative bg-brand-cream min-h-[80vh] flex items-center overflow-hidden">
      {/* faint dotted grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgb(var(--brand-gold-rgb)) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />
      <div className="relative ds-container max-w-3xl text-center py-20">
        <Eyebrow>Lost to time</Eyebrow>
        <h1 className="ds-h1 mt-4 text-balance">
          This path is not on our map.
        </h1>
        <GoldRule />
        <p className="ds-lead text-pretty">
          A page wandered off, an old link stayed. We've sent an elephant
          to look for it. In the meantime, back to the route.
        </p>

        <div className="my-10 md:my-14">
          <WanderingElephant reduce={reduce} />
        </div>

        <p className="ds-small italic text-brand-muted max-w-md mx-auto mb-8">
          "Not all who wander are lost. But this URL definitely is."
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button to="/" variant="primary" size="lg">Back to home</Button>
          <Button to="/tours" variant="ghost" size="lg">Browse journeys</Button>
          <Button to="/plan" variant="ghost" size="lg">Plan from scratch</Button>
        </div>
      </div>
    </section>
  );
};

export default PageNotFound;
