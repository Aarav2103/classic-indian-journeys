import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cij.wishlist";
const WishlistContext = createContext({
  items: [],
  has: () => false,
  toggle: () => {},
  remove: () => {},
  clear: () => {},
});

const readInitial = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) {}
  }, [items]);

  // sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setItems(parsed);
        } catch (_) {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((id) => items.some((it) => it._id === id), [items]);

  const toggle = useCallback((tour) => {
    if (!tour || !tour._id) return;
    setItems((cur) => {
      if (cur.some((it) => it._id === tour._id)) {
        return cur.filter((it) => it._id !== tour._id);
      }
      const minimal = {
        _id: tour._id,
        title: tour.title,
        city: tour.city,
        photo: tour.photo,
        price: tour.price,
        duration: tour.duration,
        addedAt: Date.now(),
      };
      return [minimal, ...cur];
    });
  }, []);

  const remove = useCallback((id) => {
    setItems((cur) => cur.filter((it) => it._id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, has, toggle, remove, clear, count: items.length }),
    [items, has, toggle, remove, clear]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => useContext(WishlistContext);
