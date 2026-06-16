import Link from "next/link";
import type { CardItem } from "@/lib/catalog";
import { formatBytes } from "@/lib/format";

// Shown whenever real cover art is missing.
const FALLBACK_COVER = "/julia/m1.jpeg";

export default function PosterCard({ item }: { item: CardItem }) {
  const title = item.meta?.title || item.title;
  const poster = item.meta?.poster_url;
  const year = item.meta?.year;
  const isSeries = Boolean(item.series);
  const href = isSeries ? `/series/${item.id}` : `/watch/${item.id}`;
  const cover = poster ?? FALLBACK_COVER;

  return (
    <Link href={href} className="group block focus:outline-none">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10 transition group-hover:ring-accent/60 group-focus-visible:ring-accent">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={title} loading="lazy" className="h-full w-full object-cover" />

        {/* Series episode-count badge */}
        {isSeries && (
          <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/15">
            {item.series!.count} eps
          </span>
        )}

        {/* Resume progress bar */}
        {item.progress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.round(item.progress.pct * 100)}%` }}
            />
          </div>
        )}

        {/* Title overlay when there's no real poster (i.e. using the fallback) */}
        {!poster && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{title}</p>
            <p className="mt-0.5 text-xs text-white/60">
              {isSeries
                ? `Series · ${item.series!.count} eps`
                : `${item.ext.replace(".", "").toUpperCase()} · ${formatBytes(item.sizeBytes)}`}
            </p>
          </div>
        )}
      </div>

      {poster && (
        <p className="mt-1.5 line-clamp-1 text-sm text-white/80">
          {title}
          {year ? <span className="text-white/40"> · {year}</span> : null}
        </p>
      )}
    </Link>
  );
}
