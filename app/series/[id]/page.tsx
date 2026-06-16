import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesEpisodes } from "@/lib/catalog";
import type { EnrichedItem } from "@/lib/catalog";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

function epInfo(relPath: string): { season: number; episode: number } {
  const m =
    /\bs(\d{1,2})[\s._-]*e(\d{1,2})\b|\b(\d{1,2})x(\d{1,2})\b|\[\s*(\d{1,2})[\s._-]+(\d{1,2})\s*\]/i.exec(
      relPath
    );
  if (m) {
    return {
      season: parseInt(m[1] || m[3] || m[5], 10),
      episode: parseInt(m[2] || m[4] || m[6], 10),
    };
  }
  const sm = /season[\s._-]*(\d+)/i.exec(relPath);
  return { season: sm ? parseInt(sm[1], 10) : 1, episode: 0 };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSeriesEpisodes(id);
  if (!data) notFound();

  const { name, episodes } = data;
  const backdrop = episodes.find((e) => e.meta?.backdrop_url)?.meta?.backdrop_url;

  // Group by season.
  const seasons = new Map<number, EnrichedItem[]>();
  for (const ep of episodes) {
    const { season } = epInfo(ep.relPath);
    const arr = seasons.get(season);
    if (arr) arr.push(ep);
    else seasons.set(season, [ep]);
  }
  const seasonNums = [...seasons.keys()].sort((a, b) => a - b);

  return (
    <div className="relative">
      {backdrop && (
        <div className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-72 overflow-hidden opacity-25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-sm text-white/50">
        {episodes.length} episodes · {seasonNums.length}{" "}
        {seasonNums.length === 1 ? "season" : "seasons"}
      </p>

      <div className="mt-8 space-y-8">
        {seasonNums.map((s) => (
          <section key={s}>
            <h2 className="mb-3 text-lg font-semibold">Season {s}</h2>
            <div className="divide-y divide-white/5 overflow-hidden rounded-xl ring-1 ring-white/10">
              {seasons
                .get(s)!
                .sort((a, b) => epInfo(a.relPath).episode - epInfo(b.relPath).episode)
                .map((ep) => {
                  const { episode } = epInfo(ep.relPath);
                  const label = ep.relPath.split("/").pop()!.replace(/\.[^.]+$/, "");
                  return (
                    <Link
                      key={ep.id}
                      href={`/watch/${ep.id}`}
                      className="flex items-center gap-3 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.06]"
                    >
                      <span className="grid h-8 w-10 shrink-0 place-items-center rounded bg-accent/15 text-sm font-semibold text-accent">
                        {episode || "•"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm">{label}</span>
                        <span className="text-xs text-white/40">{formatBytes(ep.sizeBytes)}</span>
                      </span>
                      <span className="shrink-0 text-white/40">▶</span>
                    </Link>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
