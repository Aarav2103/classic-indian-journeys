import React from "react";
import { Link } from "react-router-dom";

const FOOTER_NAV = [
  {
    title: "Explore",
    links: [
      { to: "/", label: "Home" },
      { to: "/tours", label: "Journeys" },
      { to: "/guides", label: "Travel guides" },
      { to: "/gallery", label: "Gallery" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "Our Story" },
      { to: "/contact", label: "Contact" },
      { to: "/faq", label: "FAQ" },
      { to: "/policies", label: "Booking policies" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/login", label: "Login" },
      { to: "/register", label: "Register" },
    ],
  },
];

const SOCIAL = [
  { href: "https://instagram.com", icon: "ri-instagram-line", label: "Instagram" },
  { href: "https://facebook.com", icon: "ri-facebook-circle-line", label: "Facebook" },
  { href: "https://youtube.com", icon: "ri-youtube-line", label: "YouTube" },
  { href: "https://twitter.com", icon: "ri-twitter-x-line", label: "X" },
];

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand-deep text-brand-on-deep">
      <div className="ds-container py-20 md:py-24">
        <div className="grid md:grid-cols-12 gap-12 md:gap-10">
          {/* Brand */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/logo-final.webp"
                alt="Classic Indian Journeys"
                className="h-14 w-auto"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
              />
              <span className="flex flex-col leading-tight">
                <span className="font-heading text-lg font-semibold">Classic Indian Journeys</span>
                <span className="text-xs tracking-[0.18em] uppercase text-brand-gold">Bespoke heritage travel</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-brand-on-deep/75 max-w-md">
              A founder-led inbound travel company designing unhurried,
              well-researched journeys across India, heritage stays,
              scholar-led walks, and itineraries paced for the season.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full border border-brand-on-deep/25 inline-flex items-center justify-center hover:bg-brand-gold hover:border-brand-gold hover:text-brand-deep transition-colors"
                >
                  <i className={`${s.icon} text-lg`} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {FOOTER_NAV.map((col) => (
            <div key={col.title} className="md:col-span-3 lg:col-span-2">
              <h4 className="text-xs uppercase tracking-[0.18em] font-semibold text-brand-gold mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-sm text-brand-on-deep/75 hover:text-brand-on-deep transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div className="md:col-span-12 lg:col-span-2 lg:col-start-11">
            <h4 className="text-xs uppercase tracking-[0.18em] font-semibold text-brand-gold mb-5">
              Get in touch
            </h4>
            <ul className="space-y-3 text-sm text-brand-on-deep/75">
              <li className="flex items-start gap-2.5">
                <i className="ri-map-pin-2-line text-brand-gold mt-0.5" />
                <span>New Delhi, India</span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="ri-mail-line text-brand-gold mt-0.5" />
                <a href="mailto:contact@classicindianjourneys.example" className="hover:text-brand-on-deep break-all">
                  contact@classicindianjourneys.example
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="ri-phone-line text-brand-gold mt-0.5" />
                <span>+91, coming soon</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Gold rule */}
        <div className="mt-16 mb-8 h-px bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-brand-on-deep/55">
          <p>© {year} Classic Indian Journeys. All rights reserved.</p>
          <p className="tracking-[0.18em] uppercase">Curated, never packaged.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
