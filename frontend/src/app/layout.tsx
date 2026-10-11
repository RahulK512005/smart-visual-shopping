import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { CompatibilityProvider } from "@/context/CompatibilityContext";

export const metadata: Metadata = {
  title: "Smart Visual Shopping",
  description: "Find products from a photo, then check they work with what you already own.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3">
          Skip to main content
        </a>
        <CompatibilityProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        </CompatibilityProvider>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-muted sm:px-6">
          Visual matches show what looks similar. Only a compatibility check tells you whether two products work together.
        </footer>
      </body>
    </html>
  );
}
