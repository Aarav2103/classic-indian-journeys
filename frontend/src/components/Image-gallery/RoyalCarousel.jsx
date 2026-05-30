import React, { useRef } from "react";
import SliderImport from "react-slick";
import destinations from "../../assets/data/destinations";
import SafeImage from "../../ui/SafeImage";

const Slider = SliderImport.default || SliderImport;

const settings = {
  dots: false,
  arrows: false, // controls live in a bar below, not overlapping the images
  infinite: true,
  speed: 700,
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 4500,
  swipeToSlide: true,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 2 } },
    { breakpoint: 640, settings: { slidesToShow: 1 } },
  ],
};

const NavBtn = ({ onClick, dir }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={dir === "prev" ? "Previous" : "Next"}
    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-brand-line text-brand-espresso hover:border-brand-gold/70 hover:text-brand-gold-dark transition-colors"
  >
    <i className={`${dir === "prev" ? "ri-arrow-left-s-line" : "ri-arrow-right-s-line"} text-xl`} />
  </button>
);

const RoyalCarousel = () => {
  const sliderRef = useRef(null);

  return (
    <div className="royal-carousel-wrap -mx-2">
      <Slider ref={sliderRef} {...settings}>
        {destinations.map((d) => (
          <div key={d.id} className="px-2">
            <figure className="group relative overflow-hidden rounded-lg">
              <div className="aspect-[3/4]">
                <SafeImage
                  src={d.image}
                  alt={`${d.title}, ${d.region}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/85 via-brand-espresso/15 to-transparent" />
              <figcaption className="absolute left-5 right-5 bottom-5 text-brand-parchment">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-gold-light mb-1">
                  {d.region}
                </p>
                <p className="font-heading text-lg md:text-xl">{d.title}</p>
              </figcaption>
            </figure>
          </div>
        ))}
      </Slider>

      <div className="flex items-center justify-center gap-3 mt-7">
        <NavBtn dir="prev" onClick={() => sliderRef.current?.slickPrev()} />
        <NavBtn dir="next" onClick={() => sliderRef.current?.slickNext()} />
      </div>
    </div>
  );
};

export default RoyalCarousel;
