import React, { useEffect, useRef, useState } from "react";

/**
 * GoldRule, a thin gold rule that "draws" itself outward from a centered dot
 * as it enters the viewport. Pure CSS animation; we just toggle a class.
 */
const GoldRule = ({ className = "", width = "12rem" }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ds-gold-rule ${visible ? "in-view" : ""} ${className}`.trim()}
      style={{ maxWidth: width }}
      aria-hidden="true"
    >
      <span className="ds-gold-rule-dot" />
    </div>
  );
};

export default GoldRule;
