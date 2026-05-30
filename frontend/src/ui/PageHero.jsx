import React from "react";
import Eyebrow from "./Eyebrow";
import Divider from "./Divider";

/**
 * Reusable hero/banner for interior pages (Tours, Guides, About, etc.).
 * Tone-on-tone with the cream page background to avoid the jarring
 * dark-banner-into-section break the old CommonSection had.
 */
const PageHero = ({ eyebrow, title, lead, align = "center", children }) => {
  const alignment = align === "left" ? "text-left" : "text-center mx-auto";
  return (
    <section className="bg-brand-cream pt-24 pb-16 md:pt-32 md:pb-20">
      <div className={`ds-container max-w-3xl ${alignment}`}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && <h1 className="ds-h1 mt-4 text-balance">{title}</h1>}
        <Divider className="my-6" />
        {lead && <p className="ds-lead text-pretty">{lead}</p>}
        {children}
      </div>
    </section>
  );
};

export default PageHero;
