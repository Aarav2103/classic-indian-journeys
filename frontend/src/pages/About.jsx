import React from "react";
import Eyebrow from "../ui/Eyebrow";
import Button from "../ui/Button";
import Divider from "../ui/Divider";
import Newsletter from "../shared/Newsletter";
import SafeImage from "../ui/SafeImage";
import destinations from "../assets/data/destinations";

// Known-good imagery (reused from the vetted, locally-served destinations set).
const byId = (id) => destinations.find((d) => d.id === id)?.image;
const HERO_IMAGE = byId("taj-mahal") || destinations[0].image;
const INTRO_IMAGE = byId("udaipur"); // the Lake Palace, Udaipur

const STATS = [
  { value: "Founder-led", label: "Every journey, personally planned" },
  { value: "8 regions", label: "From Rajasthan to the North-East" },
  { value: "One-of-one", label: "No two itineraries alike" },
  { value: "24/7", label: "An India-based concierge on call" },
];

const INCLUDES = [
  { icon: "ri-vip-crown-line", title: "Heritage & boutique stays", body: "Palaces, havelis and small hotels we have slept in ourselves." },
  { icon: "ri-compass-3-line", title: "Vetted local guides", body: "Storytellers, not order-takers: chosen region by region." },
  { icon: "ri-route-line", title: "Private transfers", body: "Well-kept vehicles and unhurried drives, never a group coach." },
  { icon: "ri-phone-line", title: "One point of contact", body: "A single concierge who picks up when you call, throughout." },
  { icon: "ri-sun-line", title: "The right season", body: "We plan around the weather and the light, not the calendar." },
  { icon: "ri-sparkling-2-line", title: "Room to breathe", body: "Hours built in for the long lunch and the slow morning." },
];

const PRINCIPLES = [
  { no: "01", title: "Listen first", body: "A long conversation up front: what you want, what you want to avoid, who you're travelling with, and how you actually like to spend a day on holiday." },
  { no: "02", title: "Design slowly", body: "We map the route, pick the seasons, choose stays we've been to, and write a day-by-day plan with a reason behind every choice." },
  { no: "03", title: "Stay close", body: "A single India-based concierge looks after you on the road: from the airport pickup to the last evening of the trip." },
];

const About = () => (
  <>
    {/* hero */}
    <section className="relative h-[62vh] min-h-[440px] w-full overflow-hidden">
      <SafeImage src={HERO_IMAGE} alt="Sunrise over the Taj Mahal" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/85 via-brand-espresso/45 to-brand-espresso/20" />
      <div className="relative z-10 h-full flex items-end">
        <div className="ds-container pb-14 md:pb-20">
          <Eyebrow className="!text-brand-gold-light">Our story</Eyebrow>
          <h1 className="ds-h1 !text-brand-parchment mt-3 max-w-3xl text-balance">
            A small team. A few trips a month. India, done well.
          </h1>
          <p className="ds-lead !text-brand-parchment/85 mt-5 max-w-2xl">
            A founder-led inbound travel studio crafting unhurried journeys for travellers who want depth over checklists.
          </p>
        </div>
      </div>
    </section>

    {/* intro */}
    <section className="bg-brand-parchment ds-section">
      <div className="ds-container">
        <div className="grid md:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="md:col-span-7">
            <Eyebrow>Why we exist</Eyebrow>
            <h2 className="ds-h2 mt-4 text-balance">Travel that takes its time.</h2>
            <div className="mt-6 space-y-5 ds-body text-brand-ink">
              <p>
                At <strong>Classic Indian Journeys</strong>, we don't sell packages. We design routes -
                with extra hours built in for the slow ferry, the long morning walk, the cooking
                afternoon with a host family.
              </p>
              <p>
                Every itinerary is one-of-one. Heritage hotels, vetted local guides, transfers in
                well-maintained vehicles, and a single point of contact in India who picks up when you call.
              </p>
            </div>
            <div className="mt-8">
              <Button to="/contact" variant="primary" size="lg">Start a conversation</Button>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="aspect-[4/5] overflow-hidden rounded-lg shadow-card">
              <SafeImage src={INTRO_IMAGE} alt="A heritage palace courtyard in Udaipur" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* stats band */}
    <section className="bg-brand-deep">
      <div className="ds-container py-14 md:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
          {STATS.map((s) => (
            <div key={s.value} className="text-center px-2">
              <p className="font-heading text-2xl md:text-3xl text-brand-gold-light">{s.value}</p>
              <p className="ds-small text-brand-on-deep/70 mt-2 max-w-[18ch] mx-auto">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* what's included */}
    <section className="bg-brand-cream ds-section">
      <div className="ds-container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <Eyebrow>What every journey includes</Eyebrow>
          <h2 className="ds-h2 mt-4 text-balance">Considered down to the last detail.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {INCLUDES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center">
                <i className={`${f.icon} text-xl`} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-brand-espresso">{f.title}</h3>
                <p className="ds-body text-brand-muted mt-1.5">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* quote */}
    <section className="bg-brand-parchment ds-section">
      <div className="ds-container max-w-4xl text-center">
        <i className="ri-double-quotes-l text-5xl text-brand-gold/40" />
        <blockquote className="font-heading text-2xl md:text-3xl italic text-brand-espresso leading-snug text-balance mt-2">
          India is not one trip. It is a series of small, extraordinary ones, stitched together at the right pace.
        </blockquote>
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-brand-gold-dark">- The CIJ Team</p>
      </div>
    </section>

    {/* principles */}
    <section className="bg-brand-cream ds-section">
      <div className="ds-container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <Eyebrow>How we work</Eyebrow>
          <h2 className="ds-h2 mt-4 text-balance">Three principles, every trip.</h2>
          <Divider className="mx-auto my-6" />
        </div>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
          {PRINCIPLES.map((p) => (
            <div key={p.no} className="ds-card p-8 md:p-9 h-full">
              <p className="font-heading text-3xl text-brand-gold mb-4">{p.no}</p>
              <h3 className="ds-h4">{p.title}</h3>
              <p className="ds-body mt-3 text-brand-muted">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-14">
          <Button to="/tours" variant="secondary" size="lg">Browse our journeys</Button>
        </div>
      </div>
    </section>

    <Newsletter />
  </>
);

export default About;
