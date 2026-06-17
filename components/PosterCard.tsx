import Link from "next/link";
import type { CardItem } from "@/lib/catalog";
import { formatBytes } from "@/lib/format";

const FALLBACK_COVER = "/julia/m1.jpeg";

export default function PosterCard({ item }: { item: CardItem }) {
  const title = item.meta?.title || item.title;
  const poster = item.meta?.poster_url;
  const year = item.meta?.year;
  const rating = item.meta?.rating;
  const isSeries = Boolean(item.series);
  // The easter card looks like any other unmatched title, but links to /gotcha.
  const href = item.easter ? "/gotcha" : isSeries ? `/series/${item.id}` : `/watch/${item.id}`;
  const cover = poster ?? FALLBACK_COVER;

  return (
    <Link href={href} className="group block focus:outline-none">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-soft shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] ring-1 ring-line transition duration-300 will-change-transform group-hover:-translate-y-1 group-hover:shadow-[0_22px_46px_-16px_rgba(255,77,114,0.45)] group-hover:ring-accent/70 group-focus-visible:ring-accent">
        {item.easter ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#23232b] to-[#131318]">
            <span className="absolute inset-0 grid place-items-center text-5xl text-cream/15">▶</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
          />
        )}

        {/* glaze on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-tart/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {isSeries && (
          <span className="absolute left-2 top-2 rounded-full bg-bg/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-citrus ring-1 ring-citrus/30 backdrop-blur">
            {item.series!.count} eps
          </span>
        )}

        {typeof rating === "number" && rating > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-bg/75 px-1.5 py-0.5 text-[10px] font-semibold text-cream ring-1 ring-line backdrop-blur">
            ★ {rating.toFixed(1)}
          </span>
        )}

        {item.progress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div className="h-full bg-accent" style={{ width: `${Math.round(item.progress.pct * 100)}%` }} />
          </div>
        )}

        {!poster && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent p-3">
            <p className="font-display line-clamp-2 text-sm font-medium leading-tight">{title}</p>
            <p className="mt-0.5 text-xs text-cream-dim">
              {isSeries ? `Series · ${item.series!.count} eps` : `${item.ext.replace(".", "").toUpperCase()} · ${formatBytes(item.sizeBytes)}`}
            </p>
          </div>
        )}
      </div>

      {poster && (
        <p className="mt-2 line-clamp-1 px-0.5 text-sm text-cream/85 transition-colors group-hover:text-accent">
          {title}
          {year ? <span className="text-cream-dim"> · {year}</span> : null}
        </p>
      )}
    </Link>
  );
}
