import React from "react";

const Eyebrow = ({ className = "", children }) => (
  <p className={`ds-eyebrow ${className}`.trim()}>{children}</p>
);

export default Eyebrow;
