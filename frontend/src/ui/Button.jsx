import React from "react";
import { Link } from "react-router-dom";

const variantClass = {
  primary: "ds-btn-primary",
  secondary: "ds-btn-secondary",
  ghost: "ds-btn-ghost",
  link: "ds-btn-link",
};

const sizeClass = {
  sm: "ds-btn-sm",
  md: "",
  lg: "ds-btn-lg",
};

const Button = ({
  as,
  to,
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}) => {
  const cls = `ds-btn ${variantClass[variant] || ""} ${sizeClass[size] || ""} ${className}`.trim();

  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  const Tag = as || "button";
  return <Tag className={cls} {...rest}>{children}</Tag>;
};

export default Button;
