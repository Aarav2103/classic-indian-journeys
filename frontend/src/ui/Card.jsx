import React from "react";

const Card = ({ hover = true, className = "", children, ...rest }) => {
  return (
    <div
      className={`ds-card ${hover ? "ds-card-hover" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
