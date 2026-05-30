import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import useFetch from "../hooks/useFetch";
import SafeImage from "../ui/SafeImage";
import Eyebrow from "../ui/Eyebrow";
import Divider from "../ui/Divider";
import Newsletter from "../shared/Newsletter";
import destinations from "../assets/data/destinations";
import { regionLabel } from "../utils/regions";

// Curated fallback so the page is never empty (used until tours load, or if AI/DB
// is unavailable).
const FALLBACK = destinations.map((d) => ({ src: d.image, title: d.title, sub: d.region }));

// The catalogue photos are valid but live on Unsplash, which intermittently
// throttles a burst of requests -> an occasional failed load. So we RETRY a few
// times (with a cache-busting param + small backoff) before giving up, instead
// of dropping a perfectly good image on the first blip. Only truly persistent
// failures call onDead and get removed from the grid.
const RETRIES = 3;
const GalleryImage = ({ img, onDead }) => {
  const [src, setSrc] = useState(img.src);
  const attempt = useRef(0);
  const handleError = () => {
    if (attempt.current >= RETRIES) { onDead(img.src); return; }
    attempt.current += 1;
    const sep = img.src.includes("?") ? "&" : "?";
    setTimeout(() => setSrc(`${img.src}${sep}r=${attempt.current}`), 400 * attempt.current);
  };
  return (
    <img
      src={src}
      alt={img.title}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.04]"
    />
  );
};

const Lightbox = ({ images, index, setIndex }) => {
  const open = index != null;
  const close = () => setIndex(null);
  const go = (dir) => setIndex((i) => (i + dir + images.length) % images.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const img = images[index];

  return (
    <div className="fixed inset-0 z-[70] bg-brand-deep/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8" onClick={close}>
      <button onClick={close} aria-label="Close" className="absolute top-5 right-5 w-11 h-11 rounded-full bg-brand-on-deep/10 text-brand-on-deep hover:bg-brand-on-deep/20 flex items-center justify-center">
        <i className="ri-close-line text-2xl" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous" className="absolute left-3 md:left-6 w-11 h-11 rounded-full bg-brand-on-deep/10 text-brand-on-deep hover:bg-brand-on-deep/20 flex items-center justify-center">
        <i className="ri-arrow-left-s-line text-3xl" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next" className="absolute right-3 md:right-6 w-11 h-11 rounded-full bg-brand-on-deep/10 text-brand-on-deep hover:bg-brand-on-deep/20 flex items-center justify-center">
        <i className="ri-arrow-right-s-line text-3xl" />
      </button>

      <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
        <SafeImage src={img.src} alt={img.title} className="w-full max-h-[78vh] object-contain rounded-lg" />
        <figcaption className="mt-4 flex items-center justify-between gap-4 text-brand-on-deep">
          <div>
            <p className="font-heading text-lg">{img.title}</p>
            {img.sub && <p className="ds-small text-brand-on-deep/60">{img.sub}</p>}
          </div>
          {img.to && (
            <Link to={img.to} className="ds-btn ds-btn-secondary ds-btn-sm shrink-0">
              View journey <i className="ri-arrow-right-up-line" />
            </Link>
          )}
        </figcaption>
      </figure>
    </div>
  );
};

const Gallery = () => {
  const { data: tours } = useFetch("tours");
  const [lightbox, setLightbox] = useState(null);
  // Drop only images that fail even after retries (see GalleryImage), so a real
  // broken URL disappears, but a transient Unsplash blip doesn't.
  const [dead, setDead] = useState(() => new Set());
  const markDead = (src) => setDead((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));

  // Prefer real journey photography (richer + ties to the catalogue); fall back to
  // the curated set while loading or if the catalogue is unavailable.
  const images = useMemo(() => {
    if (Array.isArray(tours) && tours.length) {
      return tours
        .filter((t) => t.photo)
        .map((t) => ({ src: t.photo, title: t.title, sub: regionLabel(t.region), to: `/tours/${t._id}` }))
        .slice(9); // skip the first 9 (first 3 rows of the 3-col grid)
    }
    return FALLBACK;
  }, [tours]);

  // What we actually render, minus any image that failed even after retries.
  const shown = useMemo(() => images.filter((im) => !dead.has(im.src)), [images, dead]);

  return (
    <>
      {/* Intro, single controlled section (no PageHero-then-section void). */}
      <section className="bg-brand-cream pt-24 md:pt-28 pb-4">
        <div className="ds-container max-w-3xl text-center">
          <Eyebrow>Gallery</Eyebrow>
          <h1 className="ds-h1 mt-4 text-balance">A visual prelude to the India we'll show you.</h1>
          <Divider className="mx-auto my-6" />
          <p className="ds-lead text-pretty">
            Palaces, ghats, forts, forests and back-lanes, moments from the routes we run. Tap any
            image to look closer.
          </p>
        </div>
      </section>

      <section className="bg-brand-cream ds-section !pt-10">
        <div className="ds-container">
          <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 768: 2, 1100: 3 }}>
            <Masonry gutter="20px">
              {shown.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="group relative block w-full overflow-hidden rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <GalleryImage img={img} onDead={markDead} />
                  <span className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute inset-x-0 bottom-0 px-5 py-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <span className="block font-heading text-brand-on-deep text-base leading-tight">{img.title}</span>
                    {img.sub && <span className="block ds-small !text-brand-on-deep/70 mt-0.5">{img.sub}</span>}
                  </span>
                </button>
              ))}
            </Masonry>
          </ResponsiveMasonry>
        </div>
      </section>

      <Lightbox images={shown} index={lightbox} setIndex={setLightbox} />

      <Newsletter />
    </>
  );
};

export default Gallery;
