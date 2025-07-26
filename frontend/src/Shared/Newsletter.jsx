import React from "react";
import { Container, Row, Col } from "reactstrap";
import logo from "../assets/images/logo-final.png";

const Newsletter = () => {
  return (
    <section className="bg-[#fdf7ec] py-12 rounded-t-3xl shadow-inner border-t border-[#d4af37]">
      <Container>
        <Row className="items-center">
          {/* Left Side */}
          <Col lg="7" className="mb-6 lg:mb-0">
            <div className="max-w-xl">
              <h2 className="text-[1.85rem] md:text-[2.1rem] font-[700] font-[var(--playfair-font)] text-[#3b2b17] mb-3">
                Join Our Travel Circle
              </h2>
              <p className="text-[#5e4a2e] text-sm md:text-base mb-5 leading-relaxed">
                Get curated travel tips, exclusive offers, and royal stories from across India.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full sm:w-auto flex-1 px-5 py-2.5 rounded-full border border-[#d4af37] bg-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition text-sm placeholder:text-gray-500"
                />
                <button className="px-5 py-2.5 bg-[#d4af37] text-white rounded-full font-semibold text-sm hover:bg-[#b89930] transition">
                  Subscribe
                </button>
              </div>
            </div>
          </Col>

          {/* Right Side - Logo */}
          <Col lg="5" className="flex justify-center lg:justify-end">
            <img
              src={logo}
              alt="Classic Indian Journeys"
              className="max-w-[140px] md:max-w-[160px] opacity-90"
              style={{ objectFit: "contain" }}
            />
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Newsletter;
