import React from "react";
import Button from "../ui/Button";
import Eyebrow from "../ui/Eyebrow";
import Divider from "../ui/Divider";

const ThankYou = () => (
  <section className="bg-brand-cream min-h-[70vh] flex items-center">
    <div className="ds-container max-w-2xl text-center py-20">
      <div className="w-16 h-16 mx-auto rounded-full bg-brand-gold/15 text-brand-gold-dark flex items-center justify-center">
        <i className="ri-check-line text-3xl" />
      </div>
      <Eyebrow className="mt-8">All set</Eyebrow>
      <h1 className="ds-h1 mt-4 text-balance">Thank you for your booking.</h1>
      <Divider />
      <p className="ds-lead text-pretty">
        Your journey request has reached our team. A concierge will write to
        you within one working day to confirm the next steps.
      </p>
      <div className="mt-10 flex flex-wrap gap-4 justify-center">
        <Button to="/" variant="primary" size="lg">Back to home</Button>
        <Button to="/tours" variant="ghost" size="lg">Explore more journeys</Button>
      </div>
    </div>
  </section>
);

export default ThankYou;
