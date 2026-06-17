import { cookies } from "next/headers";
import { searchCatalog, continueWatching, toCard, getCatalog } from "@/lib/catalog";
import { MEDIA_DIR } from "@/lib/config";
import { tmdbEnabled } from "@/lib/tmdb";
import { authEnabled } from "@/lib/auth";
import { buildJuliaView } from "@/lib/julia";
import PosterCard from "@/components/PosterCard";
import LibraryBrowser from "@/components/LibraryBrowser";
import TopActions from "@/components/TopActions";
import JuliaHome from "@/components/JuliaHome";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const [{ all }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const isJulia = cookieStore.get("homehome_who")?.value === "julia";
  const who = isJulia ? "julia" : "corey";

  // Julia gets her curated screen by default (unless she clicks "Browse everything").
  if (isJulia && all !== "1") {
    const { hero, rows } = buildJuliaView(await getCatalog(who));
    return <JuliaHome hero={hero} rows={rows} />;
  }

  // Only the first page is rendered server-side; the rest loads on demand.
  const [{ items, total }, resuming] = await Promise.all([
    searchCatalog(who, "", 0, 60),
    continueWatching(who),
  ]);
  const hasMeta = items.some((i) => i.meta?.poster_url);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-cream-dim">
          Your shelf
        </p>
        <TopActions tmdbEnabled={tmdbEnabled()} authEnabled={authEnabled()} />
      </div>

      {!tmdbEnabled() && total > 0 && (
        <div className="rounded-xl border border-line bg-bg-soft/50 p-4 text-sm text-cream-dim">
          Add a free <span className="text-cream">TMDB_API_KEY</span> to{" "}
          <span className="text-cream">.env.local</span> to pull real posters,
          titles and descriptions, then hit “Match metadata”.
        </div>
      )}

      {resuming.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
            Continue watching
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {resuming.slice(0, 6).map((item) => (
              <PosterCard key={item.id} item={toCard(item)} />
            ))}
          </div>
        </section>
      )}

      {total === 0 ? (
        <EmptyState />
      ) : (
        <LibraryBrowser initialItems={items} initialTotal={total} />
      )}

      {!hasMeta && total > 0 && tmdbEnabled() && (
        <p className="text-center text-xs text-white/30">
          Tip: click “Match metadata” to fetch posters for your library.
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-white/15 p-10 text-center">
      <p className="text-lg font-medium">No videos found yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
        The app is scanning this folder:
      </p>
      <code className="mt-3 inline-block rounded bg-black/40 px-3 py-1.5 text-xs text-accent">
        {MEDIA_DIR}
      </code>
      <p className="mx-auto mt-4 max-w-md text-sm text-white/50">
        Drop some <span className="text-white/80">.mp4</span> files in there, or
        point the app at your NAS by setting{" "}
        <span className="text-white/80">MEDIA_DIR</span> in{" "}
        <span className="text-white/80">.env.local</span> and restarting.
      </p>
    </div>
  );
}
