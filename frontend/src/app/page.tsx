"use client";
import Link from "next/link";
import { getProductPage } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { ErrorBox, SkeletonGrid } from "@/components/States";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { TiltCard } from "@/components/TiltCard";
import { UnifiedShoppingExperience } from "@/components/UnifiedShoppingExperience";

const STEPS = [
  {
    n: "01",
    icon: "📸",
    t: "Drop a photo",
    d: "A product, a screenshot, or something you spotted. Any angle works.",
    accent: { orb: "rgba(124,58,237,1)", border: "rgba(167,139,250,.25)", iconBg: "linear-gradient(135deg,rgba(124,58,237,.35),rgba(167,139,250,.18))", num: "rgba(167,139,250,.18)", numStroke: "rgba(167,139,250,.4)" },
    tag: "Step one",
  },
  {
    n: "02",
    icon: "✦",
    t: "See the closest matches",
    d: "AI ranks results from our catalog, each with a visual match score and reason.",
    accent: { orb: "rgba(0,217,255,1)", border: "rgba(0,217,255,.25)", iconBg: "linear-gradient(135deg,rgba(0,217,255,.2),rgba(0,153,255,.1))", num: "rgba(0,217,255,.18)", numStroke: "rgba(0,217,255,.4)" },
    tag: "Step two",
  },
  {
    n: "03",
    icon: "⚡",
    t: "Check it fits",
    d: "Pick what you own. Get a clear verdict from our rules engine — not an AI guess.",
    accent: { orb: "rgba(6,255,165,1)", border: "rgba(6,255,165,.25)", iconBg: "linear-gradient(135deg,rgba(6,255,165,.2),rgba(0,204,130,.1))", num: "rgba(6,255,165,.18)", numStroke: "rgba(6,255,165,.4)" },
    tag: "Step three",
  },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "AI Visual Search",
    desc: "Upload any photo and our vision AI finds the closest products in milliseconds.",
    accent: "rgba(124,58,237,.3)",
    border: "rgba(167,139,250,.2)",
  },
  {
    icon: "⚡",
    title: "Smart Compatibility",
    desc: "Rules-based engine checks real specifications — not AI guessing — for accurate answers.",
    accent: "rgba(255,184,0,.25)",
    border: "rgba(255,184,0,.2)",
  },
  {
    icon: "🎯",
    title: "Ranked Results",
    desc: "Every result comes with a visual match score and explanation for full transparency.",
    accent: "rgba(6,255,165,.25)",
    border: "rgba(6,255,165,.2)",
  },
];

export default function Home() {
  const { state, reload } = useAsync((s) => getProductPage({ pageSize: 8 }, s), []);
  return (
    <div className="space-y-28">
      <UnifiedShoppingExperience initialMode="search" />

      {/* ─── How it works ─── */}
      <section aria-labelledby="how" className="scroll-mt-24">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 id="how" className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Three steps.{" "}
            <span className="text-gradient">No guesswork.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm text-white/40 leading-relaxed">
            From a photo to a compatibility verdict in seconds. No accounts, no guessing.
          </p>
        </Reveal>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n}>
              <Reveal delay={i * 140} className="h-full">
                <TiltCard
                  className="h-full"
                  intensity={8}
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,.05) 0%, rgba(10,10,20,.85) 100%)",
                    border: `1px solid ${s.accent.border}`,
                    borderRadius: "20px",
                    boxShadow: `0 8px 40px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04), 0 0 60px ${s.accent.orb.replace("1)", "0.06)")}`,
                    backdropFilter: "blur(16px)",
                    padding: "28px",
                  }}
                >
                  {/* BG orb */}
                  <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-3xl opacity-25 transition-opacity duration-500 group-hover:opacity-50"
                    style={{ background: `radial-gradient(circle, ${s.accent.orb}, transparent)` }} />

                  {/* Icon + step number row */}
                  <div className="relative flex items-start justify-between mb-6">
                    <div
                      className="flex h-13 w-13 items-center justify-center rounded-2xl text-2xl"
                      style={{ background: s.accent.iconBg, border: `1px solid ${s.accent.border}`, width: "52px", height: "52px" }}
                    >
                      {s.icon}
                    </div>
                    <span
                      className="font-display text-5xl font-bold leading-none select-none"
                      style={{ color: s.accent.num, WebkitTextStroke: `1.5px ${s.accent.numStroke}` }}
                    >
                      {s.n}
                    </span>
                  </div>

                  {/* Tag */}
                  <p className="text-[10px] font-semibold uppercase tracking-[.2em] mb-2" style={{ color: s.accent.border }}>
                    {s.tag}
                  </p>

                  {/* Title & desc */}
                  <h3 className="text-xl font-semibold text-white leading-snug tracking-tight">{s.t}</h3>
                  <p className="mt-2.5 text-sm text-white/45 leading-relaxed">{s.d}</p>

                  {/* Bottom bar accent */}
                  <div className="mt-6 h-px w-full rounded-full opacity-50"
                    style={{ background: `linear-gradient(90deg, ${s.accent.border}, transparent)` }} />
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Browse catalog ─── */}
      <section aria-labelledby="fresh" className="scroll-mt-24">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">From the catalog</p>
              <h2 id="fresh" className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Browse the{" "}
                <span className="text-gradient-neon">demo</span>
              </h2>
            </div>
            <Link href="/products" className="btn-secondary shrink-0 text-sm">
              See all →
            </Link>
          </div>
        </Reveal>

        <div className="mt-10">
          {state.status === "loading" && <SkeletonGrid count={3} />}
          {state.status === "error" && <ErrorBox message={state.error} onRetry={reload} />}
          {state.status === "ready" && (
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
              {state.data.items.map((p) => (
                <div key={p.id} className="w-72 shrink-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section aria-label="Features" className="scroll-mt-24">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
            style={{
              background: "linear-gradient(145deg, rgba(124,58,237,.12), rgba(10,10,18,.96))",
              border: "1px solid rgba(167,139,250,.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04)"
            }}
          >
            {/* BG orbs */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="orb absolute right-0 top-0 h-72 w-72 opacity-15" style={{ background: "radial-gradient(circle,#A78BFA,transparent)" }} />
              <div className="orb absolute bottom-0 left-0 h-56 w-56 opacity-10" style={{ background: "radial-gradient(circle,#06FFA5,transparent)" }} />
            </div>

            <div className="relative mb-10">
              <p className="eyebrow">Why VYUMI</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Built different.{" "}
                <span className="text-gradient">Works smarter.</span>
              </h2>
            </div>

            <div className="relative grid gap-8 sm:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 100}>
                  <TiltCard
                    intensity={6}
                    className="group flex flex-col gap-4 rounded-2xl p-5 h-full"
                    style={{
                      background: "rgba(255,255,255,.04)",
                      border: `1px solid ${f.border}`,
                      boxShadow: `0 4px 20px rgba(0,0,0,.3), 0 0 40px ${f.accent.replace("0.3)", "0.04)")}`,
                    }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ background: f.accent, border: `1px solid ${f.border}` }}
                    >
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-tight">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{f.desc}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
