import React from "react";
import { motion, useReducedMotion } from "framer-motion";

const variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

/**
 * Reveal, fade + rise once when entering viewport. Respects reduced motion.
 * Use sparingly on heading clusters and cards; not on every paragraph.
 */
const Reveal = ({ children, delay = 0, amount = 0.2, className = "", as = "div" }) => {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
      custom={delay}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
