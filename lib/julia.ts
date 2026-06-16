import type { EnrichedItem } from "./catalog";
import { parsePath } from "./parse";

// TMDB genre IDs treated as "for Julia": Romance + Drama.
// (Rom-com = Romance+Comedy, already covered by Romance.)
export const JULIA_GENRE_IDS = new Set([10749, 18]);

export type JuliaRow = { title: string; items: EnrichedItem[] };

function hasJuliaGenre(item: EnrichedItem): boolean {
  const g = item.meta?.genres;
  if (!g) return false;
  return g.split(",").some((x) => JULIA_GENRE_IDS.has(Number(x)));
}

function isMovie(item: EnrichedItem): boolean {
  if (item.meta?.kind) return item.meta.kind === "movie";
  return parsePath(item.relPath).kind === "movie";
}

/** Build Julia's curated rows from the full catalog. */
export function juliaRows(catalog: EnrichedItem[]): JuliaRow[] {
  const rows: JuliaRow[] = [];

  // The Rookie — matched by name, no metadata needed.
  const rookie = catalog.filter(
    (i) => /\brookie\b/i.test(i.relPath) || /\brookie\b/i.test(i.meta?.title || i.title)
  );
  if (rookie.length) rows.push({ title: "The Rookie", items: rookie });

  // Movies for Julia — romance/drama movies (needs TMDB genres), best first.
  const movies = catalog
    .filter((i) => isMovie(i) && hasJuliaGenre(i))
    .sort((a, b) => (b.meta?.rating ?? 0) - (a.meta?.rating ?? 0));
  if (movies.length) rows.push({ title: "Movies for Julia", items: movies });

  return rows;
}

/** Pick a backdrop for the hero banner (first item that has one). */
export function juliaHero(rows: JuliaRow[]): EnrichedItem | null {
  for (const row of rows) {
    const withArt = row.items.find((i) => i.meta?.backdrop_url);
    if (withArt) return withArt;
  }
  return rows[0]?.items[0] ?? null;
}
