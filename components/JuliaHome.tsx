import Link from "next/link";
import type { CardItem } from "@/lib/catalog";
import PosterCard from "./PosterCard";

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
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-purple-900/30 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Hi Julia 💛
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight drop-shadow-lg sm:text-4xl">
            {hero?.title ?? "Your shows"}
          </h1>
          {hero && (
            <Link
              href={`/watch/${hero.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black active:scale-95"
            >
              ▶ Play
            </Link>
          )}
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="px-1 text-sm text-white/50">
          Nothing curated yet — once metadata is matched, your romance & drama
          picks will appear here.
        </p>
      ) : (
        rows.map((row) => <PosterRow key={row.title} row={row} />)
      )}

      <div className="pt-2 text-center">
        <Link
          href="/?all=1"
          className="text-sm text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
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
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{row.title}</h2>
      <div className="-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
        {row.items.map((item) => (
          <div key={item.id} className="w-32 shrink-0 snap-start sm:w-40">
            <PosterCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
