import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../../context/WishlistContext";

const WishlistLink = ({ compact = false }) => {
  const { count } = useWishlist();
  return (
    <Link
      to="/wishlist"
      aria-label={`Wishlist (${count})`}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-brand-line bg-brand-parchment/60 hover:bg-brand-parchment hover:border-brand-gold/60 text-brand-espresso transition-colors"
    >
      <i className={`text-base ${count > 0 ? "ri-heart-3-fill text-brand-gold-dark" : "ri-heart-3-line"}`} />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gold text-brand-espresso text-[10px] font-semibold leading-none flex items-center justify-center"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
};

export default WishlistLink;
