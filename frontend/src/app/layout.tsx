import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { ScrollTop } from "@/components/ScrollTop";
import { CompatibilityProvider } from "@/context/CompatibilityContext";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "VYUMI | Smart Visual Shopping",
  description: "Find products from a photo, then check they work with what you already own.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout: applies to every page */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:px-4 focus:py-2 focus:font-bold focus:text-white"
          style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)" }}>
          Skip to main content
        </a>
        <CompatibilityProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6">{children}</main>
          <ScrollTop />
        </CompatibilityProvider>
        <footer className="border-t border-white/5 mt-12" style={{ background: "rgba(10,10,15,.9)", backdropFilter: "blur(20px)" }}>
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-col gap-2">
              <Logo />
              <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                Visual matches show what looks similar. Only a compatibility check tells you whether two products work together.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#06FFA5" }} />
                AI-powered visual search
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#A78BFA", animationDelay: ".5s" }} />
                Rules-based compatibility
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
