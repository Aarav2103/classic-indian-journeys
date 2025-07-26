import React, { useEffect } from "react";

const ScrollProgressBar = () => {
  useEffect(() => {
    const scrollBar = document.getElementById("scroll-progress");

    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (scrollTop / scrollHeight) * 100;

      if (scrollBar) {
        scrollBar.style.width = `${scrolled}%`;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      id="scroll-progress"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "4px",
        width: "0%",
        backgroundColor: "#341902", // ✅ exact dark brown
        zIndex: 9999,
        transition: "width 0.2s ease-out",
        boxShadow: "none", // ✅ no glow
        mixBlendMode: "normal", // ✅ no overlay/blending
        opacity: 1, // ✅ force full visibility
        pointerEvents: "none",
      }}
    />
  );
};

export default ScrollProgressBar;
