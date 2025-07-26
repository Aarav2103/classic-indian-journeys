import React, { useEffect } from "react";
import { Container } from "reactstrap";
import ServiceList from "../Services/ServiceList";
import FeaturedToursList from "../Components/FeaturedTours/FeaturedToursList";
import MasonryImagesGallery from "../Components/Image-gallery/MasonryImagesGallery";
import Testimonials from "../Components/Testimonials/Testimonials";
import Newsletter from "../Shared/Newsletter";
import Contact from "./Contact";
import FeaturedBlogsList from "../Components/FeaturedBlogs.jsx/FeaturedBlogsList";
import RoyalCarousel from "../Components/Image-gallery/RoyalCarousel";

import heroBanner from "../assets/images/hero-palace.png";
import logo from "../assets/images/logo-final.png";

import AOS from "aos";
import "aos/dist/aos.css";

import ScrollProgressBar from "../Components/ScrollProgressBar";
 // ✅ add this line

const Home = () => {
  useEffect(() => {
    AOS.init({ duration: 1500, once: false });
  }, []);

  return (
    <>
      <ScrollProgressBar /> {/* ✅ visible progress bar on top */}

      {/* HERO SECTION */}
      <div
        style={{
          height: "100vh",
          backgroundImage: `url(${heroBanner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Playfair Display', serif",
          textAlign: "center",
        }}
      >
        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5))",
            zIndex: 1,
          }}
        />

        {/* Logo */}
        <img
          src={logo}
          alt="Classic Indian Journeys"
          data-aos="zoom-in"
          style={{
            zIndex: 2,
            height: "310px",
            marginBottom: "2rem",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
          }}
        />

        {/* Scroll Cue */}
        <div
          style={{
            zIndex: 2,
            marginTop: "1rem",
            animation: "bounce 2s infinite",
            fontSize: "2rem",
            color: "gold",
          }}
        >
          ↓
        </div>
      </div>

      <div style={{ borderTop: "3px solid gold", width: "100%" }} />

      <ServiceList />

      <div
        style={{
          borderTop: "2px dashed gold",
          width: "60%",
          margin: "0 auto",
        }}
      />

      <section
        style={{
          backgroundColor: "#f9f4e6",
          padding: "5rem 0",
          borderTop: "1px solid #e4d1b9",
          borderBottom: "1px solid #e4d1b9",
        }}
      >
        <Container>
          <div data-aos="zoom-in-up" style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="signature-heading">Royal Tours & Retreats</h2>
            <p
              style={{
                fontFamily: "var(--libre-font)",
                color: "#6c4f3d",
                fontSize: "1.1rem",
                marginTop: "0.5rem",
              }}
            >
              Embark on luxurious journeys fit for royalty
            </p>
          </div>
          <div data-aos="fade-up">
            <FeaturedToursList />
          </div>
        </Container>
      </section>

      <div style={{ borderTop: "2px solid #d4af37", width: "100%" }} />

      <section style={{ backgroundColor: "#fdf7ef", padding: "5rem 0" }}>
        <Container data-aos="zoom-in-up">
          <h2 className="signature-heading">Glimpses of India</h2>
          <p
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: "1.1rem",
              color: "#6c4f3d",
              textAlign: "center",
              marginBottom: "3rem",
              marginTop: "0.5rem",
            }}
          >
            Visual tales from every corner — palaces, ghats, forests, and beyond.
          </p>
          <RoyalCarousel />
        </Container>
      </section>

      <div style={{ borderTop: "2px solid #d4af37", width: "100%" }} />

      <section style={{ backgroundColor: "#fffaf2", padding: "5rem 0" }}>
        <Container>
          <div className="text-center mb-5" data-aos="zoom-in-up">
            <h2 className="royal-heading">Travel Journals</h2>
            <p
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: "1.1rem",
                color: "#6c4f3d",
                marginTop: "0.5rem",
              }}
            >
              Stories, reflections & hidden gems from across the realm
            </p>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4" data-aos="fade-up">
            <FeaturedBlogsList />
          </div>
        </Container>
      </section>

      <div style={{ borderTop: "3px double gold", width: "100%" }} />

      {/* <section style={{ backgroundColor: "#f9f3e8", padding: "5rem 0" }}>
        <Container data-aos="zoom-in">
          <h2
            className="text-center mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2.5rem",
              color: "#2d1e10",
              fontWeight: "700",
              textTransform: "none",
            }}
          >
            Reflections From Our Travelers
          </h2>
          <Testimonials />
        </Container>
      </section> */}

      <div style={{ borderTop: "1px solid #e0c280", width: "100%" }} />

      <Contact />
      <Newsletter />

      {/* Bounce Keyframes */}
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(8px); }
            60% { transform: translateY(4px); }
          }
        `}
      </style>

      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Playfair+Display:wght@400;700&display=swap"
        rel="stylesheet"
      />
    </>
  );
};

export default Home;
