/* Hand-drawn, marker-style doodles for max cuteness. Stroke colors use the tart
   palette CSS vars so they stay on-theme. */

type P = { className?: string };

const r = {
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Strawberry({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M24 15c8 0 14 5 14 11 0 8-7 17-14 17S10 34 10 26c0-6 6-11 14-11Z"
        fill="var(--tart)"
        stroke="var(--cream)"
        strokeWidth="2"
        {...r}
      />
      <path
        d="M19 23l1 2M27 22l1 2M23 29l1 2M31 28l1 2M16 29l1 2M22 36l1 2M30 35l1 2"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="1.5"
        {...r}
      />
      <path
        d="M24 15c-2-5-6-7-9-6 3 1 4 3 5 6M24 15c2-5 6-7 9-6-3 1-4 3-5 6M24 15c-1-5 0-8 0-9 1 1 1 4 0 9"
        fill="none"
        stroke="var(--citrus)"
        strokeWidth="2.2"
        {...r}
      />
    </svg>
  );
}

export function Cherry({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M24 9c2 6 6 11 11 14M24 9c-2 6-6 11-11 14M23 8c4-3 9-2 11 2" fill="none" stroke="var(--citrus)" strokeWidth="2.2" {...r} />
      <circle cx="14" cy="30" r="7.5" fill="var(--tart)" stroke="var(--cream)" strokeWidth="2" />
      <circle cx="34" cy="30" r="7.5" fill="var(--tart)" stroke="var(--cream)" strokeWidth="2" />
      <path d="M11 28c1-1 2-1 3 0M31 28c1-1 2-1 3 0" fill="none" stroke="var(--cream)" strokeWidth="1.4" {...r} />
    </svg>
  );
}

export function Heart({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M24 40C9 30 7 20 14 16c5-3 9 0 10 4 1-4 5-7 10-4 7 4 5 14-10 24Z"
        fill="var(--tart)"
        stroke="var(--cream)"
        strokeWidth="2"
        {...r}
      />
    </svg>
  );
}

export function Sparkle({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M24 6c1.5 11 2.5 12 14 13-11.5 1-12.5 2-14 13-1.5-11-2.5-12-14-13 11.5-1 12.5-2 14-13Z"
        fill="var(--citrus)"
      />
    </svg>
  );
}

export function Squiggle({ className }: P) {
  return (
    <svg viewBox="0 0 120 12" className={className} aria-hidden preserveAspectRatio="none">
      <path d="M2 7c10-6 16 2 26-2s16 6 28 2 18-6 30-2 18 2 32-2" fill="none" stroke="var(--citrus)" strokeWidth="3" {...r} />
    </svg>
  );
}

export function TartSlice({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M7 35c6-17 12-23 19-21l15 21c-1 2-32 2-34 0Z" fill="var(--crust)" stroke="var(--cream)" strokeWidth="2" {...r} />
      <path d="M12 32c5-11 11-15 15-14l9 14c-1 1-23 1-24 0Z" fill="var(--tart)" />
      <circle cx="20" cy="27" r="2.4" fill="var(--cream)" />
      <circle cx="28" cy="28" r="2.2" fill="var(--cream)" />
      <circle cx="24" cy="22" r="2" fill="var(--citrus)" />
    </svg>
  );
}

export function Lemon({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M10 24a14 9 30 1 0 28 0 14 9 30 1 0-28 0Z" fill="var(--citrus)" stroke="var(--cream)" strokeWidth="2" {...r} />
      <path d="M24 11v26M14 15l20 18M14 33L34 15M11 24h26" fill="none" stroke="var(--cream)" strokeWidth="1.4" opacity="0.7" {...r} />
    </svg>
  );
}

/** Subtle scattered doodles behind page content. */
export function Scatter() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.11]" aria-hidden>
      <Strawberry className="absolute left-[4%] top-[18%] h-14 w-14 -rotate-12" />
      <Sparkle className="absolute left-[22%] top-[8%] h-8 w-8" />
      <Cherry className="absolute right-[6%] top-[26%] h-16 w-16 rotate-12" />
      <Heart className="absolute right-[20%] top-[62%] h-10 w-10 -rotate-6" />
      <TartSlice className="absolute left-[8%] top-[72%] h-16 w-16 rotate-6" />
      <Sparkle className="absolute right-[12%] top-[84%] h-7 w-7" />
      <Lemon className="absolute left-[46%] top-[40%] h-10 w-10 rotate-12" />
      <Strawberry className="absolute right-[40%] top-[6%] h-9 w-9 rotate-6" />
    </div>
  );
}
