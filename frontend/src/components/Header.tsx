"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCompatibility } from "@/context/CompatibilityContext";
import { Logo } from "./Logo";

const links = [
  { href: "/search", label: "Find similar", icon: "🔍" },
  { href: "/compatibility", label: "Will it work?", icon: "⚡" },
  { href: "/products", label: "Catalog", icon: "🛍️" },
];

export function Header() {
  const path = usePathname();
  const { owned, candidate } = useCompatibility();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const picked = [owned, candidate].filter(Boolean).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/5 py-2"
          : "bg-transparent py-4"
      }`}
      style={scrolled ? { background: "rgba(10,10,15,.85)", backdropFilter: "blur(20px)" } : undefined}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" aria-label="VYUMI home" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          <div
            className="flex items-center gap-1 rounded-full border border-white/10 p-1.5"
            style={{ background: "rgba(255,255,255,.04)", backdropFilter: "blur(12px)" }}
          >
            {links.map((l) => {
              const active = path === l.href || path.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "text-white shadow-neon"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                  style={active ? {
                    background: "linear-gradient(135deg, rgba(124,58,237,.5), rgba(167,139,250,.3))",
                    boxShadow: "0 0 0 1px rgba(167,139,250,.3), 0 4px 16px rgba(124,58,237,.3)"
                  } : undefined}
                >
                  {l.label}
                  {l.href === "/compatibility" && picked > 0 && (
                    <span
                      className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-ink"
                      style={{ background: "linear-gradient(135deg,#06FFA5,#00D9FF)" }}
                      aria-label={`${picked} of 2 products selected`}
                    >
                      {picked}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex sm:hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
        >
          <span className={`block h-0.5 w-5 bg-white transition-all ${mobileOpen ? "rotate-45 translate-y-1.5" : ""}`} />
          <span className={`block h-0.5 w-5 bg-white mt-1.5 transition-all ${mobileOpen ? "-rotate-45 -translate-y-0" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="mx-4 mt-2 rounded-2xl border border-white/10 p-2 sm:hidden animate-slide-up"
          style={{ background: "rgba(20,20,32,.95)", backdropFilter: "blur(20px)" }}
        >
          {links.map((l) => {
            const active = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
                style={active ? { background: "linear-gradient(135deg,rgba(124,58,237,.3),rgba(167,139,250,.15))" } : undefined}
              >
                <span>{l.icon}</span>
                {l.label}
                {l.href === "/compatibility" && picked > 0 && (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-ink"
                    style={{ background: "linear-gradient(135deg,#06FFA5,#00D9FF)" }}
                  >
                    {picked}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
