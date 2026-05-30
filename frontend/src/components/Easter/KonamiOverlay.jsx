import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

const CODE = "MARIGOLD-VII";

/**
 * KonamiOverlay, listens globally for the Konami sequence.
 * On match: a tasteful, full-screen "founder's note" with a discount code.
 * Gold confetti drifts across once, then dissipates.
 */
const KonamiOverlay = () => {
  const buffer = useRef([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer.current.push(key);
      if (buffer.current.length > SEQUENCE.length) buffer.current.shift();
      const match = buffer.current.length === SEQUENCE.length &&
        buffer.current.every((k, i) => k === SEQUENCE[i]);
      if (match) {
        buffer.current = [];
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  // Generate 36 confetti particles only when open
  const confetti = open ? Array.from({ length: 36 }, (_, i) => i) : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="konami"
          role="dialog"
          aria-modal="true"
          aria-label="A note from the founder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-5"
        >
          {/* deep backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-[#0B0703]/85 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* confetti */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
            {confetti.map((i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 0.6;
              const dur = 3 + Math.random() * 2.5;
              const size = 4 + Math.random() * 5;
              const rot = Math.random() * 360;
              const drift = (Math.random() - 0.5) * 40;
              return (
                <motion.span
                  key={i}
                  initial={{ y: "-12vh", x: 0, rotate: rot, opacity: 0 }}
                  animate={{
                    y: "115vh",
                    x: drift,
                    rotate: rot + 360,
                    opacity: [0, 1, 1, 0.8, 0],
                  }}
                  transition={{ duration: dur, delay, ease: "linear" }}
                  className="absolute block"
                  style={{
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size * 0.4}px`,
                    background: "linear-gradient(90deg, #E6CE91, #C9A24A)",
                    boxShadow: "0 0 8px rgba(201,162,74,0.6)",
                    borderRadius: "2px",
                  }}
                />
              );
            })}
          </div>

          {/* card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg bg-brand-parchment border border-brand-gold/40 rounded-2xl shadow-lift overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-brand-cream text-brand-muted hover:text-brand-espresso hover:bg-brand-parchment border border-brand-line flex items-center justify-center transition-colors"
            >
              <i className="ri-close-line text-[15px]" />
            </button>

            <div className="px-8 md:px-10 pt-10 md:pt-12 pb-8 md:pb-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-brand-gold/15 text-brand-gold-dark flex items-center justify-center mb-6">
                <i className="ri-sparkling-line text-[22px]" />
              </div>
              <p className="text-[0.7rem] uppercase tracking-[0.32em] text-brand-gold-dark font-semibold mb-4">
                A note from the founder
              </p>
              <h2 className="font-heading text-3xl md:text-4xl text-brand-espresso leading-tight text-balance">
                You found the marigold door.
              </h2>
              <div className="h-px w-24 mx-auto my-6 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />
              <p className="font-heading italic text-lg md:text-xl text-brand-ink leading-relaxed text-pretty">
                Hello. Whoever you are, you went looking, and looking is the most
                Indian way to travel. As thanks: a quiet 7% off your first journey
                with us.
              </p>
              <div className="mt-7">
                <p className="ds-eyebrow mb-3">Use the code</p>
                <button
                  type="button"
                  onClick={copy}
                  className="group inline-flex items-center gap-3 rounded-full border-2 border-dashed border-brand-gold px-7 py-3.5 font-heading text-2xl tracking-[0.18em] text-brand-espresso bg-brand-cream hover:bg-brand-gold/10 transition-colors"
                  aria-label={copied ? "Copied" : "Copy discount code"}
                >
                  {CODE}
                  <span className="opacity-70 group-hover:opacity-100">
                    {copied ? <i className="ri-check-line text-base" /> : <i className="ri-file-copy-line text-base" />}
                  </span>
                </button>
                <p className="ds-small mt-3">
                  {copied ? "Copied. Use it when you write." : "Tap to copy. Mention it in your enquiry."}
                </p>
              </div>
              <p className="ds-small text-center mt-8 italic">
, Founder's note <br />
                <span className="not-italic ds-caption">(this overlay does not appear twice in the same session)</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KonamiOverlay;
