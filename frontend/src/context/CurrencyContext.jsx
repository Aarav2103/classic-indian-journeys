import React, { createContext, useContext, useCallback, useMemo } from "react";

// This is a DOMESTIC (India) tour site, all prices are INR only.
// (The context previously carried USD/EUR/GBP, but there was no switcher UI and
// the studio sells within India, so we keep it INR-only and simple. The
// `format`/`code`/`current`/`rates`/`setCode` shape is preserved so existing
// consumers keep working unchanged. localStorage is intentionally ignored now,
// so any stale "cij.currency" value can't surface a non-INR price.)
const INR = { symbol: "₹", code: "INR", per_inr: 1, locale: "en-IN", flag: "🇮🇳", label: "Rupee" };
const RATES = { INR };

const formatINR = (inrAmount) => {
  if (typeof inrAmount !== "number" || !isFinite(inrAmount) || inrAmount <= 0) return null;
  const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  return `₹${fmt.format(Math.round(inrAmount))}`;
};

const CurrencyContext = createContext({
  code: "INR",
  rates: RATES,
  current: INR,
  setCode: () => {},
  format: formatINR,
});

export const CurrencyProvider = ({ children }) => {
  const format = useCallback(formatINR, []);
  const value = useMemo(
    () => ({ code: "INR", rates: RATES, current: INR, setCode: () => {}, format }),
    [format]
  );
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
export { RATES };
