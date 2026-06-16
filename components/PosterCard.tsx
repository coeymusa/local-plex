import Link from "next/link";
import type { CardItem } from "@/lib/catalog";
import { formatBytes, gradientFor } from "@/lib/format";

export default function PosterCard({ item }: { item: CardItem }) {
  const title = item.meta?.title || item.title;
  const poster = item.meta?.poster_url;
  const year = item.meta?.year;

  return (
    <Link href={`/watch/${item.id}`} className="group block focus:outline-none">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10 transition group-hover:ring-accent/60 group-focus-visible:ring-accent"
        style={poster ? undefined : { background: gradientFor(title) }}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-4xl opacity-30">▶</span>
          </div>
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

        {/* Title overlay only when there's no real poster */}
        {!poster && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{title}</p>
            <p className="mt-0.5 text-xs text-white/50">
              {item.ext.replace(".", "").toUpperCase()} · {formatBytes(item.sizeBytes)}
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
