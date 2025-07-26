import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo-final.png";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-[#fdf5e6] to-[#f4e3c1] text-[#3b2b17] font-[Playfair Display] border-t border-[#c8a548] pt-14 pb-10 shadow-[inset_0_6px_12px_rgba(212,167,65,0.1)]">
      {/* Top Crest */}
      <div className="text-center mb-8 px-4">
        <img
          src={logo}
          alt="Classic Indian Journeys"
          className="h-14 mx-auto drop-shadow-md"
        />
        <p className="mt-4 max-w-2xl mx-auto text-[15px] italic text-[#4b361d] leading-relaxed">
          Embark on regal voyages across ancient palaces, mystic ghats, and divine
          landscapes — an odyssey of timeless elegance.
        </p>

        <div className="mt-6 flex justify-center gap-6 text-[20px]">
          {[
            { href: "https://youtube.com", icon: "ri-youtube-fill" },
            { href: "https://facebook.com", icon: "ri-facebook-circle-line" },
            { href: "https://instagram.com", icon: "ri-instagram-line" },
            { href: "https://twitter.com", icon: "ri-twitter-line" },
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="text-[#3b2b17] hover:text-[#c8a548] transition"
            >
              <i className={item.icon} />
            </a>
          ))}
        </div>

        <div className="w-24 h-[1px] bg-[#c8a548] mx-auto mt-8 mb-6" />
      </div>

      {/* Explore & Connect */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-10 px-4 sm:px-8">
        {/* Explore */}
        <div>
          <h5
            className="
              font-[Playfair Display]
              text-[17px]
              font-semibold
              text-[#2d1e10]
              uppercase
              tracking-wide
              underline decoration-[#c8a548] decoration-2
              underline-offset-4
              mb-4
              text-center sm:text-left
            "
          >
            Explore
          </h5>
          <ul className="space-y-2 text-[15px] text-[#4b361d] text-center sm:text-left">
            <li>
              <Link to="/" className="hover:text-[#c8a548] transition">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-[#c8a548] transition">
                About
              </Link>
            </li>
            <li>
              <Link to="/tours" className="hover:text-[#c8a548] transition">
                Tours
              </Link>
            </li>
            <li>
              <Link to="/blogs" className="hover:text-[#c8a548] transition">
                Blogs
              </Link>
            </li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h5
            className="
              font-[Playfair Display]
              text-[17px]
              font-semibold
              text-[#2d1e10]
              uppercase
              tracking-wide
              underline decoration-[#c8a548] decoration-2
              underline-offset-4
              mb-4
              text-center sm:text-left
            "
          >
            Connect
          </h5>
          <ul className="space-y-2 text-[15px] text-[#4b361d] text-center sm:text-left">
            <li>
              <Link to="/login" className="hover:text-[#c8a548] transition">
                Login
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[#c8a548] transition">
                Register
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="mt-12 text-center text-xs text-[#6c4f3d] italic">
        &copy; {year} <span className="font-semibold">Classic Indian Journeys</span>. Crafted with elegance.
      </div>
    </footer>
  );
};

export default Footer;
