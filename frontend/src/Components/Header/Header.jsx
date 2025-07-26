import React, { useRef, useEffect, useContext, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo-final.png";
import { AuthContext } from "../../context/AuthContext";

const navLinks = [
  { path: "/", display: "Home" },
  { path: "/about", display: "About" },
  {
    display: "Tours",
    dropdown: true,
    items: [
      { path: "/tours/region/central-india", display: "Central India Tours" },
      { path: "/tours/region/east-india", display: "East India Tours" },
      { path: "/tours/region/leh-ladakh", display: "Leh Ladakh Tours" },
      { path: "/tours/region/north-india", display: "North India Tours" },
      { path: "/tours/region/north-east-india", display: "North East India Tours" },
      { path: "/tours/region/rajasthan", display: "Rajasthan Tours" },
      { path: "/tours/region/south-india", display: "South India Tours" },
      { path: "/tours/region/west-india", display: "West India Tours" },
    ],
  },
  { path: "/blogs", display: "Blogs" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToursOpen, setIsToursOpen] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [hovered, setHovered] = useState(null);

  const headerRef = useRef(null);
  const { user, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      const header = headerRef.current;
      if (window.scrollY > 100) {
        header.classList.add("is-sticky");
        setShowLogo(true);
      } else {
        header.classList.remove("is-sticky");
        setShowLogo(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`w-full z-50 transition-all duration-500 font-['Playfair Display'] ${
        showLogo ? "sticky top-0 shadow-md animate-slideFadeOnce" : ""
      }`}
      style={{
        backgroundColor: "#FDF2D2",
        borderBottom: "1px solid #D4A741",
      }}
    >
      <div className="max-w-7xl mx-auto flex justify-center items-center h-16 px-4 lg:px-8 relative">
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-[17px]">
          {navLinks.slice(0, 2).map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) =>
                `no-underline transition-colors duration-300 font-medium text-[#5a3e2b] hover:text-[#D4A741] ${
                  isActive ? "text-[#D4A741]" : ""
                }`
              }
            >
              {item.display}
            </NavLink>
          ))}

          {showLogo && (
            <Link to="/" className="mx-4">
              <img
                src={logo}
                alt="Classic Indian Journeys"
                className="h-10 w-auto transition-all duration-500"
              />
            </Link>
          )}

          {navLinks.slice(2).map((item, idx) =>
            item.dropdown ? (
              <div key={idx} className="relative group">
                <span className="cursor-pointer font-medium text-[#5a3e2b] hover:text-[#D4A741] flex items-center">
                  {item.display}
                  <i className="ri-arrow-down-s-line ml-1"></i>
                </span>
                <div className="absolute top-full left-0 bg-white text-[#5a3e2b] z-50 hidden group-hover:block rounded-md overflow-hidden shadow-xl animate-fadeInUp border border-gold min-w-[260px]">
                  {item.items.map((subItem, subIdx) => (
                    <React.Fragment key={subIdx}>
                      <Link
                        to={subItem.path}
                        className="block px-5 py-2 whitespace-nowrap hover:bg-[#D4A741] hover:text-white transition-all duration-300 font-medium"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                        }}
                      >
                        {subItem.display}
                      </Link>
                      {subIdx < item.items.length - 1 && (
                        <div className="h-[1px] w-[85%] mx-auto bg-[#D4A741] opacity-40" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) =>
                  `no-underline transition-colors duration-300 font-medium text-[#5a3e2b] hover:text-[#D4A741] ${
                    isActive ? "text-[#D4A741]" : ""
                  }`
                }
              >
                {item.display}
              </NavLink>
            )
          )}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center space-x-3 absolute right-8">
          {user ? (
            <>
              <span className="text-[#2d1e10] font-medium">
                {user.username.charAt(0).toUpperCase() + user.username.slice(1)}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-full bg-[#2d1e10] text-white text-sm font-medium hover:opacity-90 transition hover:scale-[1.02]"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button
                  onMouseEnter={() => setHovered("login")}
                  onMouseLeave={() => setHovered(null)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition hover:scale-[1.02]"
                  style={{
                    backgroundColor: hovered === "login" ? "#D4A741" : "#FDF2D2",
                    color: hovered === "login" ? "white" : "#2d1e10",
                  }}
                >
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition hover:scale-[1.02]"
                  style={{
                    backgroundColor: "#D4A741",
                    color: "white",
                  }}
                >
                  Register
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div
          className="md:hidden text-3xl cursor-pointer text-[#2d1e10] absolute right-4"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <i className="ri-close-line"></i> : <i className="ri-menu-line"></i>}
        </div>
      </div>

      {/* Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-[#FDF2D2] shadow-2xl z-50 transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Logo */}
          <Link to="/" onClick={() => setIsMenuOpen(false)}>
            <img src={logo} alt="Classic Indian Journeys" className="h-12 mb-6" />
          </Link>

          {/* Links */}
          <div className="flex-1 overflow-y-auto">
            {navLinks.map((item, idx) =>
              item.dropdown ? (
                <div key={idx} className="mb-4">
                  <button
                    className="w-full text-left font-semibold text-[#5a3e2b] flex justify-between items-center py-2 border-b border-[#D4A741]"
                    onClick={() => setIsToursOpen(!isToursOpen)}
                  >
                    {item.display}
                    <i className={`ri-arrow-${isToursOpen ? "up" : "down"}-s-line`}></i>
                  </button>
                  {isToursOpen && (
                    <div className="pl-3 mt-2 space-y-2">
                      {item.items.map((subItem, subIdx) => (
                        <Link
                          key={subIdx}
                          to={subItem.path}
                          className="block text-[#5a3e2b] hover:text-[#D4A741] transition"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {subItem.display}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={idx}
                  to={item.path}
                  className="block py-2 text-[#5a3e2b] hover:text-[#D4A741] border-b border-[#D4A741]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.display}
                </NavLink>
              )
            )}
          </div>

          {/* Auth */}
          <div className="mt-4">
            {user ? (
              <>
                <p className="mb-2 text-[#2d1e10] font-medium">
                  {user.username.charAt(0).toUpperCase() + user.username.slice(1)}
                </p>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-full bg-[#2d1e10] text-white text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <button className="w-full px-3 py-2 rounded-full border border-[#D4A741] text-[#2d1e10]">
                    Login
                  </button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <button className="w-full px-3 py-2 rounded-full bg-[#D4A741] text-white">
                    Register
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
