"use client";
import { useEffect, useState } from "react";

export function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full text-lg text-white shadow-neon transition-all duration-300 hover:scale-110 hover:shadow-glow ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
      style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 4px 20px rgba(124,58,237,.4)" }}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
