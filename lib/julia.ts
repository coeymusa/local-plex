import { groupCatalog, toCard, type EnrichedItem, type CardItem } from "./catalog";
import { parsePath } from "./parse";

// TMDB genre IDs treated as "for Julia": Romance + Drama.
export const JULIA_GENRE_IDS = new Set([10749, 18]);

export type JuliaRow = { title: string; items: CardItem[] };
export type JuliaView = {
  hero: { id: string; title: string; backdrop_url: string | null } | null;
  rows: JuliaRow[];
};

function hasJuliaGenre(item: EnrichedItem): boolean {
  const g = item.meta?.genres;
  if (!g) return false;
  return g.split(",").some((x) => JULIA_GENRE_IDS.has(Number(x)));
}

function isMovie(item: EnrichedItem): boolean {
  if (item.meta?.kind) return item.meta.kind === "movie";
  return parsePath(item.relPath).kind === "movie";
}

/** Build Julia's curated screen: a hero + grouped rows. */
export function buildJuliaView(catalog: EnrichedItem[]): JuliaView {
  const rookie = catalog.filter(
    (i) => /\brookie\b/i.test(i.relPath) || /\brookie\b/i.test(i.meta?.title || i.title)
  );
  const movies = catalog
    .filter((i) => isMovie(i) && hasJuliaGenre(i))
    .sort((a, b) => (b.meta?.rating ?? 0) - (a.meta?.rating ?? 0));

  const rows: JuliaRow[] = [];
  if (rookie.length) rows.push({ title: "The Rookie", items: groupCatalog(rookie) });
  if (movies.length) rows.push({ title: "Movies for Julia", items: movies.map(toCard) });

  const heroSrc = [...movies, ...rookie];
  const heroItem = heroSrc.find((i) => i.meta?.backdrop_url) ?? heroSrc[0] ?? null;
  const hero = heroItem
    ? {
        id: heroItem.id,
        title: heroItem.meta?.title || heroItem.title,
        backdrop_url: heroItem.meta?.backdrop_url ?? null,
      }
    : null;

  return { hero, rows };
}
