import React from "react";

const toneClass = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

const Alert = ({ tone = "info", className = "", children, onClose }) => (
  <div
    role="alert"
    className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${toneClass[tone]} ${className}`}
  >
    <div>{children}</div>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 transition"
      >
        <i className="ri-close-line text-lg" />
      </button>
    )}
  </div>
);

export default Alert;
