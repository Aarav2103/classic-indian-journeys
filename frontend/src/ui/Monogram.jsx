import React from "react";

const Monogram = ({ name, size = 44, className = "" }) => {
  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.4) }}
      className={`shrink-0 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-dark text-brand-parchment font-heading font-semibold ${className}`.trim()}
    >
      {initials}
    </div>
  );
};

export default Monogram;
