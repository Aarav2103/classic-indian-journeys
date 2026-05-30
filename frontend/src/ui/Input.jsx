import React, { forwardRef } from "react";

export const Input = forwardRef(({ label, error, className = "", id, ...rest }, ref) => {
  const inputId = id || rest.name;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="ds-label">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        className={`ds-input ${error ? "!border-brand-terracotta" : ""} ${className}`.trim()}
        {...rest}
      />
      {error && <p className="ds-small mt-1.5 text-brand-terracotta">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(({ label, error, className = "", id, ...rest }, ref) => {
  const inputId = id || rest.name;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="ds-label">{label}</label>}
      <textarea
        ref={ref}
        id={inputId}
        className={`ds-textarea ${error ? "!border-brand-terracotta" : ""} ${className}`.trim()}
        {...rest}
      />
      {error && <p className="ds-small mt-1.5 text-brand-terracotta">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(({ label, error, className = "", id, children, ...rest }, ref) => {
  const inputId = id || rest.name;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="ds-label">{label}</label>}
      <select
        ref={ref}
        id={inputId}
        className={`ds-select ${error ? "!border-brand-terracotta" : ""} ${className}`.trim()}
        {...rest}
      >{children}</select>
      {error && <p className="ds-small mt-1.5 text-brand-terracotta">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";
Textarea.displayName = "Textarea";
Select.displayName = "Select";
