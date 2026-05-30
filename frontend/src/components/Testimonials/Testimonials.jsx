import React, { useRef } from "react";
import SliderImport from "react-slick";
import Monogram from "../../ui/Monogram";

// react-slick is CJS; Vite v8 (rolldown) interop sometimes wraps the default.
const Slider = SliderImport.default || SliderImport;

const testimonials = [
  {
    name: "Ananya Kapoor",
    location: "Mumbai",
    quote:
      "Our Rajasthan circuit was crafted with care, from the Amber Fort sunrise to the lake-side dinner in Udaipur. Every detail felt thought through. We never had to ask twice for anything.",
  },
  {
    name: "Rohan Iyer",
    location: "Bengaluru",
    quote:
      "The Kerala backwater stay was the highlight of our anniversary. The houseboat, the welcome at the heritage lodge in Kochi, the hosted dinner, it felt personal, never packaged.",
  },
  {
    name: "Priya Menon",
    location: "Chennai",
    quote:
      "I travel for work often and was sceptical that a guided trip could surprise me. Varanasi at dawn with our scholar-guide changed that. Honestly the best India trip I have ever taken.",
  },
  {
    name: "James & Linda Carter",
    location: "London",
    quote:
      "We wanted heritage, not a checklist. Classic Indian Journeys built us a slow, two-week route through Jaipur, Khajuraho and Hampi. Every host they put us with felt like family.",
  },
  {
    name: "A traveller from Pune",
    location: "Verified booking",
    quote:
      "Ladakh in summer was on my list for years. The acclimatisation pace, the local homestays, the small group size, everything was handled. I just had to show up and breathe in the mountains.",
  },
];

const TestimonialCard = ({ t }) => (
  <div className="px-3 h-full">
    <figure className="ds-card h-full p-8 md:p-10 flex flex-col">
      <i className="ri-double-quotes-l text-4xl text-brand-gold/70 mb-4" />
      <blockquote className="font-heading text-[1.05rem] md:text-[1.15rem] leading-relaxed text-brand-ink italic text-pretty">
        {t.quote}
      </blockquote>
      <figcaption className="mt-6 pt-6 border-t border-brand-line flex items-center gap-4">
        <Monogram name={t.name} size={44} />
        <div>
          <p className="font-heading text-brand-espresso">{t.name}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-brand-muted mt-0.5">
            {t.location}
          </p>
        </div>
      </figcaption>
    </figure>
  </div>
);

const Testimonials = () => {
  const sliderRef = useRef(null);

  const settings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 700,
    slidesToShow: 2,
    slidesToScroll: 1,
    swipeToSlide: true,
    // The active dot elongates into a gold pill.
    customPaging: () => (
      <button type="button" className="cij-dot" aria-label="Go to testimonial" />
    ),
    // A control bar BELOW the cards: prev, dots, next. Nothing overlaps content.
    appendDots: (dots) => (
      <div>
        <button
          type="button"
          onClick={() => sliderRef.current?.slickPrev()}
          aria-label="Previous testimonial"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-brand-line text-brand-espresso hover:border-brand-gold/70 hover:text-brand-gold-dark transition-colors"
        >
          <i className="ri-arrow-left-s-line text-xl" />
        </button>
        <ul>{dots}</ul>
        <button
          type="button"
          onClick={() => sliderRef.current?.slickNext()}
          aria-label="Next testimonial"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-brand-line text-brand-espresso hover:border-brand-gold/70 hover:text-brand-gold-dark transition-colors"
        >
          <i className="ri-arrow-right-s-line text-xl" />
        </button>
      </div>
    ),
    responsive: [
      { breakpoint: 992, settings: { slidesToShow: 2 } },
      { breakpoint: 768, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="testimonials-slider -mx-3">
      <Slider ref={sliderRef} {...settings}>
        {testimonials.map((t, i) => (
          <TestimonialCard key={i} t={t} />
        ))}
      </Slider>

      <style>{`
        .testimonials-slider .slick-track {
          display: flex !important;
          padding-bottom: 0.5rem;
        }
        .testimonials-slider .slick-slide { height: auto; }
        .testimonials-slider .slick-slide > div { height: 100%; }

        /* appendDots wrapper becomes .slick-dots, lay it out as a control bar */
        .testimonials-slider .slick-dots {
          display: flex !important;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          list-style: none;
          padding: 0;
          margin-top: 1.75rem;
          position: relative;
          bottom: 0;
        }
        .testimonials-slider .slick-dots ul {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .testimonials-slider .slick-dots li { width: auto; height: auto; margin: 0; }
        .testimonials-slider .cij-dot {
          display: block;
          width: 8px;
          height: 8px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(201, 162, 74, 0.35);
          cursor: pointer;
          transition: width 0.35s ease, background-color 0.35s ease;
        }
        .testimonials-slider .cij-dot:hover { background: rgba(201, 162, 74, 0.6); }
        .testimonials-slider .slick-dots li.slick-active .cij-dot {
          width: 24px;
          background: var(--brand-gold-dark);
        }
      `}</style>
    </div>
  );
};

export default Testimonials;
