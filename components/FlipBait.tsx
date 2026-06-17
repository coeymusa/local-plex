"use client";

import { useState } from "react";

/** A "super blurred" teaser that flips on tap to reveal the second gotcha. */
export default function FlipBait() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mt-10 [perspective:1200px]">
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label="reveal"
        className="relative mx-auto aspect-[3/4] w-56 [transform-style:preserve-3d] transition-transform duration-700 will-change-transform sm:w-64"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front — heavily blurred teaser */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl ring-1 ring-line [backface-visibility:hidden]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/julia/teaser.jpg"
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm"
          />
          <div className="absolute inset-0 grid place-items-center bg-black/15">
            <span className="rounded-full bg-bg/55 px-3 py-1 text-xs font-medium uppercase tracking-widest text-cream/90 backdrop-blur">
              tap to reveal
            </span>
          </div>
        </div>

        {/* Back — the second gotcha */}
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-bg-soft p-5 text-center ring-1 ring-accent/40 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="font-display text-2xl font-semibold leading-snug text-cream">
            I can&apos;t believe you fell for it twice
          </p>
        </div>
      </button>
    </div>
  );
}
