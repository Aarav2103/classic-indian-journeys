import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Contact from "./Contact";
import Newsletter from "../Shared/Newsletter";
import logo1 from "../assets/images/logo-final.png";
import heroBanner from "../assets/images/hero-palace.png";

const About = () => {
  useEffect(() => {
    AOS.init({ duration: 1500, once: false });
  }, []);

  return (
    <>
      {/* HERO BANNER */}
      <section
        style={{
          backgroundImage: `url(${heroBanner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          textAlign: "center",
          position: "relative",
          fontFamily: "'Playfair Display', serif",
          color: "#fffdf7",
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            background: "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5))",
            zIndex: 1,
          }}
        />
        {/* Logo */}
        <img
          src={logo1}
          alt="Classic Indian Journeys"
          data-aos="zoom-in"
          style={{
            height: "280px",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
            marginBottom: "2rem",
            zIndex: 2,
          }}
        />
        {/* Tagline */}
        <div
          style={{
            fontSize: "1.8rem",
            fontWeight: "500",
            fontFamily: "'Playfair Display', serif",
            zIndex: 2,
          }}
          data-aos="fade-up"
        >
          Crafted with elegance. Inspired by heritage.
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="bg-[#fffaf2] py-24">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-14 items-center">
          <div data-aos="fade-right">
            <div className="mb-4">
              <p className="text-[#bfa44b] uppercase tracking-widest text-base font-semibold">
                About Us
              </p>
              <h2 className="text-5xl font-heading text-[#2d1e10] leading-tight mt-2">
                Where Every Journey Becomes <span className="text-[#d4af37]">Royal</span>
              </h2>
              <div className="w-24 h-1.5 bg-[#d4af37] mt-4 mb-6" />
            </div>
            <p className="text-[1.15rem] leading-8 text-[#5e4a2e] mb-5">
              At <strong>Classic Indian Journeys</strong>, we don’t just plan tours — we craft
              regal experiences. Wander through sandstone palaces, ride heritage trains, or sip
              masala chai overlooking centuries-old ghats.
            </p>
            <p className="text-[1.15rem] leading-8 text-[#5e4a2e]">
              From personalized service to immersive storytelling, we’re dedicated to showing you
              India in a way few ever experience — timeless, opulent, unforgettable.
            </p>
          </div>
          <div data-aos="fade-left" className="flex justify-center md:justify-end">
            <img
              src={logo1}
              alt="CIJ Logo"
              className="max-w-sm rounded-xl shadow-2xl border-4 border-[#d4af37]"
            />
          </div>
        </div>
      </section>

      {/* QUOTE SECTION */}
      <section className="bg-[#f9f3e7] py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <blockquote
            className="text-3xl italic font-heading text-[#3b2b17] leading-relaxed"
            data-aos="fade-up"
          >
            "India isn’t a destination — it’s an unfolding epic. Let us help you write your
            chapter."
          </blockquote>
          <p className="mt-6 text-[#d4af37] text-lg font-semibold">— The CIJ Team</p>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="bg-[#fffdf7] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2
            className="text-center text-4xl font-heading text-[#2d1e10] mb-12"
            data-aos="zoom-in"
          >
            Our Journey
          </h2>
          <div className="grid md:grid-cols-3 gap-10 text-center">
            <div data-aos="fade-up">
              <h3 className="text-[#d4af37] text-2xl font-semibold mb-2">2010</h3>
              <p className="text-[#5e4a2e]">
                Founded in Delhi with a passion for luxury heritage tours.
              </p>
            </div>
            <div data-aos="fade-up" data-aos-delay="100">
              <h3 className="text-[#d4af37] text-2xl font-semibold mb-2">2015</h3>
              <p className="text-[#5e4a2e]">
                Expanded across 40+ regions with curated experiences steeped in culture.
              </p>
            </div>
            <div data-aos="fade-up" data-aos-delay="200">
              <h3 className="text-[#d4af37] text-2xl font-semibold mb-2">Today</h3>
              <p className="text-[#5e4a2e]">
                Redefining premium Indian travel for a global audience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & NEWSLETTER */}
      <Contact />
      <Newsletter />
    </>
  );
};

export default About;
//force