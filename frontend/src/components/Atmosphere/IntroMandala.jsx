import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const SESSION_FLAG = "cij.intro.shown";

/**
 * IntroMandala, once-per-session, a brief animated gold mandala draws itself,
 * then the curtain lifts. Suppressed on reduced motion. Max ~1.6s.
 */
const IntroMandala = () => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.sessionStorage.getItem(SESSION_FLAG) !== "1"; }
    catch (_) { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    if (reduce) {
      // honor reduced-motion: dismiss immediately
      setVisible(false);
      try { sessionStorage.setItem(SESSION_FLAG, "1"); } catch (_) {}
      return;
    }
    // lock scroll during intro
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(SESSION_FLAG, "1"); } catch (_) {}
    }, 1200);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [visible, reduce]);

  // 12-petal mandala
  const petals = Array.from({ length: 12 }, (_, i) => i);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-cream"
        >
          {/* page-edge frame */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="absolute inset-6 md:inset-10 border border-brand-gold/30 rounded-2xl"
          />

          {/* mandala */}
          <motion.svg
            viewBox="-100 -100 200 200"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[180px] h-[180px] md:w-[220px] md:h-[220px]"
            initial={{ opacity: 0, scale: 0.92, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="goldcore" cx="0" cy="0" r="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgb(var(--brand-gold-light-rgb))" />
                <stop offset="100%" stopColor="rgb(var(--brand-gold-rgb))" />
              </radialGradient>
            </defs>

            {/* outer ring */}
            <motion.circle
              r="80"
              fill="none"
              stroke="rgb(var(--brand-gold-rgb))"
              strokeWidth="0.8"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ rotate: 90 }}
            />
            <motion.circle
              r="62"
              fill="none"
              stroke="rgb(var(--brand-gold-rgb) / 0.6)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ rotate: 90 }}
            />

            {/* 12 petals */}
            {petals.map((i) => (
              <motion.path
                key={i}
                d="M 0 -78 C 8 -54, 8 -30, 0 -10 C -8 -30, -8 -54, 0 -78 Z"
                fill="none"
                stroke="rgb(var(--brand-gold-rgb))"
                strokeWidth="0.7"
                style={{ transformOrigin: "0 0", rotate: `${(360 / petals.length) * i}deg` }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.18 + i * 0.035, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}

            {/* inner ring */}
            <motion.circle
              r="22"
              fill="none"
              stroke="rgb(var(--brand-gold-rgb))"
              strokeWidth="0.6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ rotate: 90 }}
            />

            {/* core */}
            <motion.circle
              r="8"
              fill="url(#goldcore)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.svg>

          {/* wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-16 md:bottom-20 text-center"
          >
            <p className="font-heading text-brand-espresso text-lg md:text-xl tracking-wide">
              Classic Indian Journeys
            </p>
            <p className="ds-eyebrow mt-2">An unhurried welcome</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroMandala;
