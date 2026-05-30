import React from "react";

const Divider = ({ className = "", dot = true }) => (
  <div className={`ds-divider ${className}`.trim()} aria-hidden="true">
    {dot && <span className="ds-divider-dot" />}
  </div>
);

export default Divider;
