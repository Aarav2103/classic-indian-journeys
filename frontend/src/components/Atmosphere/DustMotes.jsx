import React, { useEffect, useRef } from "react";

/**
 * DustMotes, slow, golden-light dust motes drifting on a canvas.
 * Tasteful, low-density, GPU-cheap. Pauses when off-screen or reduced motion.
 */
const DustMotes = ({
  density = 60,
  color = "rgba(230, 206, 145, 0.55)", // brand-gold-light w/ alpha
  className = "",
}) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const motesRef = useRef([]);
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // seed motes
      motesRef.current = new Array(density).fill(0).map(() => spawn(w, h));
    };

    const spawn = (W, H, fromBottom = false) => ({
      x: Math.random() * W,
      y: fromBottom ? H + Math.random() * 40 : Math.random() * H,
      r: 0.6 + Math.random() * 1.8,
      vy: -(0.05 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * 0.12,
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 0.0006 + Math.random() * 0.0014,
      alpha: 0.25 + Math.random() * 0.55,
    });

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const motes = motesRef.current;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.drift += m.driftSpeed;
        m.x += m.vx + Math.sin(m.drift) * 0.15;
        m.y += m.vy;
        if (m.y < -10 || m.x < -10 || m.x > w + 10) {
          motes[i] = spawn(w, h, true);
          continue;
        }
        ctx.beginPath();
        ctx.fillStyle = color.replace(/, [\d.]+\)/, `, ${m.alpha.toFixed(2)})`);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        // soft halo
        ctx.beginPath();
        ctx.fillStyle = color.replace(/, [\d.]+\)/, `, ${(m.alpha * 0.18).toFixed(3)})`);
        ctx.arc(m.x, m.y, m.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };

    resize();
    start();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);

    const onVis = () => {
      if (document.hidden) stop();
      else if (visibleRef.current) start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      observer.disconnect();
    };
  }, [density, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
};

export default DustMotes;
