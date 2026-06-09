import React from "react";
import { Link } from "react-router-dom";

/* Page header with optional right-aligned action(s) */
export const AdminHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="font-heading text-2xl md:text-3xl text-brand-espresso">{title}</h1>
      {subtitle && <p className="ds-small mt-1 text-brand-muted">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-3">{children}</div>}
  </div>
);

/* Dashboard stat tile */
export const StatCard = ({ label, value, icon, to }) => {
  const inner = (
    <div className="ds-card p-6 flex items-center gap-4 h-full">
      {icon && (
        <div className="w-12 h-12 shrink-0 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center">
          <i className={`${icon} text-2xl`} />
        </div>
      )}
      <div>
        <p className="font-heading text-3xl text-brand-espresso leading-none">{value}</p>
        <p className="ds-small mt-1 text-brand-muted">{label}</p>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block ds-card-hover rounded-lg">{inner}</Link>
  ) : (
    inner
  );
};

/* Card wrapper (no hover lift) */
export const Panel = ({ className = "", children }) => (
  <div className={`ds-card p-0 overflow-hidden ${className}`}>{children}</div>
);

export const Spinner = ({ label = "Loading..." }) => (
  <div className="min-h-[40vh] flex flex-col items-center justify-center text-center">
    <div className="w-9 h-9 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-3" />
    <p className="ds-small text-brand-muted">{label}</p>
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="ds-card p-8 text-center">
    <p className="ds-lead mb-4">{message || "Something went wrong."}</p>
    {onRetry && (
      <button onClick={onRetry} className="ds-btn ds-btn-secondary ds-btn-sm">
        Try again
      </button>
    )}
  </div>
);

export const EmptyState = ({ icon = "ri-inbox-line", title, hint, children }) => (
  <div className="ds-card p-12 text-center">
    <div className="w-14 h-14 mx-auto rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center mb-4">
      <i className={`${icon} text-2xl`} />
    </div>
    <p className="font-heading text-xl text-brand-espresso">{title}</p>
    {hint && <p className="ds-small mt-2 text-brand-muted max-w-md mx-auto">{hint}</p>}
    {children && <div className="mt-6">{children}</div>}
  </div>
);

/* Responsive table shell. Pass <thead>/<tbody> as children. */
export const Table = ({ children }) => (
  <div className="ds-card p-0 overflow-x-auto">
    <table className="w-full text-left text-sm border-collapse">{children}</table>
  </div>
);

export const Th = ({ children, className = "" }) => (
  <th
    className={`px-5 py-3.5 font-medium text-xs uppercase tracking-[0.1em] text-brand-muted border-b border-brand-line bg-brand-cream/60 ${className}`}
  >
    {children}
  </th>
);

export const Td = ({ children, className = "" }) => (
  <td className={`px-5 py-4 border-b border-brand-line/70 align-top text-brand-ink ${className}`}>
    {children}
  </td>
);

/* Small inline action button used in tables */
export const RowAction = ({ onClick, to, danger, children, ...rest }) => {
  const cls = `inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
    danger
      ? "text-brand-terracotta hover:text-red-700"
      : "text-brand-gold-dark hover:text-brand-espresso"
  }`;
  if (to)
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} {...rest}>
      {children}
    </button>
  );
};

export const Badge = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-brand-line/50 text-brand-ink",
    gold: "bg-brand-gold/15 text-brand-gold-dark",
    green: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
};

/* Confirm + run an async delete, surfacing errors via alert(). */
export const confirmAnd = async (message, fn, onDone) => {
  if (!window.confirm(message)) return;
  try {
    await fn();
    if (onDone) onDone();
  } catch (e) {
    alert(e?.response?.data?.message || e?.message || "Action failed.");
  }
};

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";
