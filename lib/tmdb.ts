import type { ParsedName } from "./parse";

const KEY = process.env.TMDB_API_KEY;
const IMG = "https://image.tmdb.org/t/p";

export type TmdbResult = {
  tmdb_id: number;
  title: string;
  year: number | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  /** TMDB genre IDs, comma-separated (e.g. "10749,18"). */
  genres: string | null;
};

export function tmdbEnabled(): boolean {
  return Boolean(KEY);
}

/** Look up a parsed filename on TMDB. Returns null if no key or no match. */
export async function tmdbLookup(p: ParsedName): Promise<TmdbResult | null> {
  if (!KEY) return null;
  if (!p.title) return null;

  const isTv = p.kind === "tv";
  const url = new URL(`https://api.themoviedb.org/3/search/${isTv ? "tv" : "movie"}`);
  url.searchParams.set("api_key", KEY);
  url.searchParams.set("query", p.title);
  url.searchParams.set("include_adult", "false");
  if (p.year) {
    url.searchParams.set(isTv ? "first_air_date_year" : "year", String(p.year));
  }

  let json: { results?: TmdbRaw[] };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }

  const hit = json.results?.[0];
  if (!hit) return null;

  const date = hit.release_date ?? hit.first_air_date ?? "";
  return {
    tmdb_id: hit.id,
    title: hit.title ?? hit.name ?? p.title,
    year: date ? parseInt(date.slice(0, 4), 10) : p.year,
    overview: hit.overview || null,
    poster_url: hit.poster_path ? `${IMG}/w500${hit.poster_path}` : null,
    backdrop_url: hit.backdrop_path ? `${IMG}/w1280${hit.backdrop_path}` : null,
    rating: typeof hit.vote_average === "number" ? hit.vote_average : null,
    genres: hit.genre_ids?.length ? hit.genre_ids.join(",") : null,
  };
}

type TmdbRaw = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
};
