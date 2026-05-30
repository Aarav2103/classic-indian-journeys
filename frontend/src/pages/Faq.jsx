import React from "react";
import PageHero from "../ui/PageHero";
import FAQ from "../shared/FAQ";

// /faq, the full FAQ, rendered from the knowledge corpus (same answers the
// concierge cites). PageHero titles the page, so the accordion drops its own header.
const Faq = () => (
  <>
    <PageHero
      eyebrow="Good to know"
      title="Frequently asked questions"
      lead="Booking and payments, visas and seasons, what's included, the same answers our travel concierge gives, in one place."
    />
    <FAQ anchors showHeader={false} />
  </>
);

export default Faq;
