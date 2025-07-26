import React from "react";
import Slider from "react-slick";
import galleryImages from "./galleryImage";
import "./GlimpsesGallery.css";

const RoyalCarousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 4000,
    responsive: [
      {
        breakpoint: 992,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1 },
      },
    ],
  };

  return (
    <Slider {...settings} className="royal-carousel">
      {galleryImages.map((img, index) => (
        <div key={index} className="royal-carousel-card">
          <div className="carousel-image-wrapper">
            <img
              src={img.src}
              alt={`slide-${index}`}
              className="royal-carousel-img"
            />
            <div className="carousel-caption-overlay">
              <p>{img.title}</p>
            </div>
          </div>
        </div>
      ))}
    </Slider>
  );
};

export default RoyalCarousel;
