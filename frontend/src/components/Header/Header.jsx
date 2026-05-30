import React, { useContext, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import Button from "../../ui/Button";
import ThemeToggle from "./ThemeToggle";
import WishlistLink from "./WishlistLink";
import AccountMenu from "./AccountMenu";

const REGION_LINKS = [
  { path: "/tours/region/north-india", display: "North India" },
  { path: "/tours/region/rajasthan", display: "Rajasthan" },
  { path: "/tours/region/south-india", display: "South India" },
  { path: "/tours/region/east-india", display: "East India" },
  { path: "/tours/region/west-india", display: "West India" },
  { path: "/tours/region/central-india", display: "Central India" },
  { path: "/tours/region/north-east-india", display: "North East India" },
  { path: "/tours/region/leh-ladakh", display: "Leh Ladakh" },
];

// Top-nav: trimmed to what visitors actually use during a session.
// Gallery still lives in the footer + is reachable from any region/tour page.
const NAV_LINKS = [
  { path: "/", display: "Home" },
  { path: "/about", display: "About" },
  { display: "Journeys", path: "/tours", dropdown: REGION_LINKS },
  { path: "/plan", display: "Plan" },
  { path: "/guides", display: "Guides" },
  { path: "/contact", display: "Contact" },
];

// Mobile drawer can afford one more, keep Gallery here.
const MOBILE_EXTRA_LINKS = [
  { path: "/gallery", display: "Gallery" },
];

const linkClass = ({ isActive }) =>
  `relative inline-flex items-center text-[0.92rem] font-medium tracking-wide transition-colors duration-200 ${
    isActive
      ? "text-brand-gold-dark"
      : "text-brand-espresso hover:text-brand-gold-dark"
  }`;

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toursOpen, setToursOpen] = useState(false);
  const { user, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close menu when route changes (sniff body click after a tick)
  useEffect(() => {
    if (!mobileOpen) document.body.style.overflow = "";
    else document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/");
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
        scrolled
          ? "bg-brand-parchment/95 backdrop-blur border-b border-brand-line shadow-soft"
          : "bg-brand-cream"
      }`}
    >
      <div className="ds-container">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo, wordmark shows only when there's room (xl+) so lg nav doesn't crush. */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img
              src="/logo-final.webp"
              alt="Classic Indian Journeys"
              className="h-11 md:h-12 lg:h-12 xl:h-14 w-auto"
            />
            <span className="hidden xl:flex flex-col leading-tight">
              <span className="font-heading text-[1.05rem] xl:text-[1.15rem] text-brand-espresso font-semibold tracking-tight">
                Classic Indian Journeys
              </span>
              <span className="ds-eyebrow !text-[0.65rem] !text-brand-muted hidden 2xl:block">
                Bespoke heritage travel
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {NAV_LINKS.map((item) =>
              item.dropdown ? (
                <div key={item.display} className="relative group">
                  <NavLink to={item.path} className={linkClass} end={false}>
                    {item.display}
                    <i className="ri-arrow-down-s-line ml-1 text-base opacity-70 group-hover:rotate-180 transition-transform" />
                  </NavLink>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="min-w-[240px] rounded-lg bg-brand-white border border-brand-line shadow-card overflow-hidden py-2">
                      <Link
                        to={item.path}
                        className="block px-5 py-2.5 text-sm font-medium text-brand-espresso hover:bg-brand-cream hover:text-brand-gold-dark transition-colors border-b border-brand-line mb-1"
                      >
                        View all journeys &rarr;
                      </Link>
                      <p className="px-5 pt-1 pb-1 text-[0.65rem] uppercase tracking-[0.16em] text-brand-muted">By region</p>
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className="block px-5 py-2.5 text-sm text-brand-ink hover:bg-brand-cream hover:text-brand-gold-dark transition-colors"
                        >
                          {sub.display}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <NavLink key={item.path} to={item.path} className={linkClass} end={item.path === "/"}>
                  {item.display}
                </NavLink>
              )
            )}
          </nav>

          {/* Desktop utility cluster + auth, icon-only on lg, label visible at 2xl */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
            <ThemeToggle compact />
            <WishlistLink compact />
            <span className="h-6 w-px bg-brand-line mx-1 hidden xl:block" aria-hidden="true" />
            {user ? (
              <AccountMenu user={user} onLogout={logout} />
            ) : (
              <Link
                to="/login"
                className="text-[0.85rem] font-medium text-brand-espresso hover:text-brand-gold-dark transition-colors px-2"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Open menu"
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-brand-line text-brand-espresso"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <i className={`text-2xl ${mobileOpen ? "ri-close-line" : "ri-menu-line"}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-brand-parchment border-b border-brand-line shadow-soft animate-slideDown">
          <div className="ds-container py-6 space-y-1">
            {NAV_LINKS.map((item) =>
              item.dropdown ? (
                <div key={item.display}>
                  <button
                    onClick={() => setToursOpen((v) => !v)}
                    className="w-full flex items-center justify-between py-3 text-left text-brand-espresso font-medium"
                  >
                    <span>{item.display}</span>
                    <i className={`ri-arrow-down-s-line text-xl transition-transform ${toursOpen ? "rotate-180" : ""}`} />
                  </button>
                  {toursOpen && (
                    <div className="pl-4 pb-3 space-y-1 border-l border-brand-line ml-2">
                      <Link
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-sm text-brand-ink hover:text-brand-gold-dark"
                      >
                        All Tours
                      </Link>
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setMobileOpen(false)}
                          className="block py-2 text-sm text-brand-ink hover:text-brand-gold-dark"
                        >
                          {sub.display}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block py-3 font-medium border-b border-brand-line/60 ${
                      isActive ? "text-brand-gold-dark" : "text-brand-espresso"
                    }`
                  }
                  end={item.path === "/"}
                >
                  {item.display}
                </NavLink>
              )
            )}

            {MOBILE_EXTRA_LINKS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block py-3 font-medium border-b border-brand-line/60 ${
                    isActive ? "text-brand-gold-dark" : "text-brand-espresso"
                  }`
                }
              >
                {item.display}
              </NavLink>
            ))}

            <div className="pt-5 flex items-center gap-2">
              <ThemeToggle compact />
              <WishlistLink compact />
            </div>
            <div className="pt-4 flex flex-col gap-3">
              {user ? (
                <>
                  {user.role === "admin" && (
                    <Button to="/admin" variant="ghost" onClick={() => setMobileOpen(false)}>
                      <i className="ri-dashboard-line" /> Admin dashboard
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => { logout(); setMobileOpen(false); }}>Logout</Button>
                </>
              ) : (
                <Button to="/login" variant="ghost" onClick={() => setMobileOpen(false)}>Login</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
