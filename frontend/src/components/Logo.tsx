export function Logo({ small = false }: { small?: boolean }) {
  const size = small ? 24 : 32;
  return (
    <span className={`inline-flex items-center gap-2.5 font-display font-bold tracking-tight ${small ? "text-base" : "text-xl"}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden fill="none">
        <defs>
          <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="logo-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06FFA5" />
            <stop offset="100%" stopColor="#00D9FF" />
          </linearGradient>
          <filter id="logo-glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="32" height="32" rx="10" fill="url(#logo-bg)" />
        <path d="M8 9l8 14 8-14" fill="none" stroke="url(#logo-v)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#logo-glow)" />
        <circle cx="16" cy="12" r="2.2" fill="#06FFA5" filter="url(#logo-glow)" />
      </svg>
      <span className="text-gradient-brand">VYUMI</span>
    </span>
  );
}
