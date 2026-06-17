import Link from "next/link";
import type { CardItem } from "@/lib/catalog";
import PosterCard from "./PosterCard";
import { Strawberry, Sparkle, Heart } from "./Doodles";

export type Row = { title: string; items: CardItem[] };

export default function JuliaHome({
  hero,
  rows,
}: {
  hero: { id: string; title: string; backdrop_url: string | null } | null;
  rows: Row[];
}) {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative -mx-6 -mt-8 h-[42vh] min-h-[280px] overflow-hidden sm:rounded-b-3xl">
        {hero?.backdrop_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.backdrop_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-tart/35 via-bg-soft to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        <Strawberry className="absolute right-5 top-5 h-12 w-12 -rotate-12 drop-shadow-lg sm:h-16 sm:w-16" />
        <Sparkle className="absolute right-20 top-8 h-6 w-6" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7">
          <p className="flex items-center gap-1.5 font-display text-sm font-medium uppercase tracking-[0.22em] text-citrus">
            Hi Julia <Heart className="h-4 w-4" />
          </p>
          <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight drop-shadow-lg sm:text-5xl">
            {hero?.title ?? "Your shows"}
          </h1>
          {hero && (
            <Link
              href={`/watch/${hero.id}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-bg shadow-[0_8px_24px_-8px_rgba(255,77,114,0.7)] transition hover:bg-citrus active:scale-95"
            >
              ▶ Play
            </Link>
          )}
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="px-1 text-sm text-cream-dim">
          Nothing curated yet — once metadata is matched, your romance &amp; drama
          picks will appear here.
        </p>
      ) : (
        rows.map((row) => <PosterRow key={row.title} row={row} />)
      )}

      <div className="pt-2 text-center">
        <Link
          href="/?all=1"
          className="text-sm text-cream-dim underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          Browse everything
        </Link>
      </div>
    </div>
  );
}

function PosterRow({ row }: { row: Row }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight">{row.title}</h2>
      <div className="h-scroll -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-7 sm:px-7">
        {row.items.map((item) => (
          <div key={item.id} className="w-32 shrink-0 sm:w-40">
            <PosterCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
