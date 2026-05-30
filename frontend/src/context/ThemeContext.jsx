import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext({ mode: "day", toggle: () => {} });
const STORAGE_KEY = "cij.theme";

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "day";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "day" || saved === "night") return saved;
    } catch (_) {}
    return "day";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.classList.toggle("theme-night", mode === "night");
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (_) {}
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === "day" ? "night" : "day"));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
