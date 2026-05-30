import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

const ThemeToggle = ({ compact = false }) => {
  const { mode, toggle } = useTheme();
  const isNight = mode === "night";
  const label = isNight ? "Switch to Day in India" : "Switch to Night in India";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={isNight ? "Day in India" : "Night in India"}
        className="relative w-10 h-10 rounded-full border border-brand-line bg-brand-parchment/60 hover:bg-brand-parchment hover:border-brand-gold/60 transition-colors text-brand-espresso flex items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isNight ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center text-brand-gold"
            >
              <i className="ri-moon-line text-base" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center text-brand-gold-dark"
            >
              <i className="ri-sun-line text-base" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={isNight ? "Day in India" : "Night in India"}
      className="relative inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-parchment/60 hover:bg-brand-parchment hover:border-brand-gold/60 transition-colors text-brand-espresso h-10 px-3.5 text-[0.78rem]"
    >
      <span className="relative w-5 h-5 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isNight ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center text-brand-gold"
            >
              <i className="ri-moon-line text-base" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center text-brand-gold-dark"
            >
              <i className="ri-sun-line text-base" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="tracking-[0.18em] uppercase font-medium">
        {isNight ? "Night" : "Day"}
      </span>
    </button>
  );
};

export default ThemeToggle;
