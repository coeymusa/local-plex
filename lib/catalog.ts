import { getDb, type MetadataRow, type ProgressRow } from "./db";
import {
  scanLibrary,
  scanLibraryCached,
  encodeId,
  decodeId,
  type MediaItem,
} from "./library";
import { parsePath } from "./parse";
import { tmdbLookup } from "./tmdb";

export type EnrichedItem = MediaItem & {
  meta: MetadataRow | null;
  progress: { position: number; duration: number; pct: number } | null;
};

function metaMap(): Map<string, MetadataRow> {
  const rows = getDb().prepare("SELECT * FROM metadata").all() as MetadataRow[];
  return new Map(rows.map((r) => [r.rel_path, r]));
}

// Progress is stored per viewer: the row id is "<who>:<mediaId>". This maps a
// viewer's rows back to plain media ids.
function progressMap(who: string): Map<string, ProgressRow> {
  const prefix = who + ":";
  const rows = getDb()
    .prepare("SELECT * FROM progress WHERE id LIKE ?")
    .all(prefix + "%") as ProgressRow[];
  const m = new Map<string, ProgressRow>();
  for (const r of rows) m.set(r.id.slice(prefix.length), r);
  return m;
}

function enrich(
  item: MediaItem,
  metas: Map<string, MetadataRow>,
  progs: Map<string, ProgressRow>
): EnrichedItem {
  const meta = metas.get(item.relPath) ?? null;
  const p = progs.get(item.id);
  const progress =
    p && p.duration > 0
      ? { position: p.position, duration: p.duration, pct: p.position / p.duration }
      : null;
  return { ...item, meta, progress };
}

/** Full catalog with cached metadata + the given viewer's resume progress. */
export async function getCatalog(who = "corey"): Promise<EnrichedItem[]> {
  const [items, metas, progs] = [await scanLibraryCached(), metaMap(), progressMap(who)];
  return items.map((i) => enrich(i, metas, progs));
}

export async function getEnrichedItem(id: string, who = "corey"): Promise<EnrichedItem | null> {
  const items = await getCatalog(who);
  return items.find((i) => i.id === id) ?? null;
}

/** Items the viewer started but hasn't finished, newest first. */
export async function continueWatching(who = "corey"): Promise<EnrichedItem[]> {
  const all = await getCatalog(who);
  const progs = progressMap(who);
  return all
    .filter((i) => i.progress && i.progress.pct > 0.02 && i.progress.pct < 0.95)
    .sort(
      (a, b) =>
        (progs.get(b.id)?.updated_at ?? 0) - (progs.get(a.id)?.updated_at ?? 0)
    );
}

/**
 * Fetch TMDB metadata for items that don't have it yet. Runs with light
 * concurrency to be polite to the API. Returns how many were matched.
 */
export async function refreshMetadata(): Promise<{ matched: number; missing: number }> {
  const items = await scanLibrary();
  const have = metaMap();
  const todo = items.filter((i) => !have.has(i.relPath));

  const upsert = getDb().prepare(`
    INSERT INTO metadata
      (rel_path, tmdb_id, kind, title, year, overview, poster_url, backdrop_url, rating, genres, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(rel_path) DO UPDATE SET
      tmdb_id=excluded.tmdb_id, kind=excluded.kind, title=excluded.title,
      year=excluded.year, overview=excluded.overview, poster_url=excluded.poster_url,
      backdrop_url=excluded.backdrop_url, rating=excluded.rating, genres=excluded.genres,
      fetched_at=excluded.fetched_at
  `);

  let matched = 0;
  const now = Date.now();
  const CONCURRENCY = 4;

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        const parsed = parsePath(item.relPath);
        const found = await tmdbLookup(parsed);
        return { item, parsed, found };
      })
    );
    for (const { item, parsed, found } of results) {
      if (found) {
        matched++;
        upsert.run(
          item.relPath,
          found.tmdb_id,
          parsed.kind,
          found.title,
          found.year,
          found.overview,
          found.poster_url,
          found.backdrop_url,
          found.rating,
          found.genres,
          now
        );
      } else {
        // Record a "no match" row so we don't keep retrying every refresh.
        upsert.run(
          item.relPath,
          null,
          parsed.kind,
          parsed.title,
          parsed.year,
          null,
          null,
          null,
          null,
          null,
          now
        );
      }
    }
  }

  return { matched, missing: todo.length };
}

export function displayTitle(item: EnrichedItem): string {
  return item.meta?.title || item.title;
}

// --- Lightweight payload for grids (keeps the wire/SSR size small) ----------
export type CardItem = {
  id: string;
  title: string;
  ext: string;
  sizeBytes: number;
  directPlay: boolean;
  meta: {
    title: string | null;
    year: number | null;
    poster_url: string | null;
    rating: number | null;
  } | null;
  progress: { pct: number } | null;
  /** Present when this card represents a grouped TV series, not a single file. */
  series?: { count: number };
  /** A planted easter-egg card (links to /gotcha, shows a "?" cover). */
  easter?: boolean;
};

export function toCard(i: EnrichedItem): CardItem {
  return {
    id: i.id,
    title: i.title,
    ext: i.ext,
    sizeBytes: i.sizeBytes,
    directPlay: i.directPlay,
    meta: i.meta
      ? { title: i.meta.title, year: i.meta.year, poster_url: i.meta.poster_url, rating: i.meta.rating }
      : null,
    progress: i.progress ? { pct: i.progress.pct } : null,
  };
}

// --- Series grouping --------------------------------------------------------
// Detects TV episodes (S01E02, 1x02, [3 01], "Season N", "Episode N") and
// collapses each show into a single card that opens its episode list.
const EP_SIGNAL =
  /\bs\d{1,2}[\s._-]*e\d{1,2}\b|\b\d{1,2}x\d{1,2}\b|\[\s*\d{1,2}[\s._-]+\d{1,2}\s*\]|\bseason[\s._-]*\d+\b|\bepisode[\s._-]*\d+\b|\bE\d{2}\b/i;

export function isEpisode(relPath: string): boolean {
  return EP_SIGNAL.test(relPath);
}

/** Normalised show name for grouping (strips season/collection noise). */
export function seriesName(relPath: string): string {
  return parsePath(relPath)
    .title.replace(/\b(season|series|s|part)[\s._-]*\d+\b/gi, "")
    .replace(/\b(complete|collection|full|the\s+complete)\b/gi, "")
    .replace(/[-–—\s]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const SERIES_PREFIX = "S:";

function toSeriesCard(name: string, eps: EnrichedItem[]): CardItem {
  // Use the first episode that has artwork for the series poster.
  const withArt = eps.find((e) => e.meta?.poster_url) ?? eps[0];
  return {
    id: encodeId(SERIES_PREFIX + name),
    title: name,
    ext: "",
    sizeBytes: eps.reduce((s, e) => s + e.sizeBytes, 0),
    directPlay: false,
    meta: {
      title: name,
      year: withArt.meta?.year ?? null,
      poster_url: withArt.meta?.poster_url ?? null,
      rating: withArt.meta?.rating ?? null,
    },
    progress: null,
    series: { count: eps.length },
  };
}

/** Collapse episodes into series cards; movies stay individual. */
export function groupCatalog(items: EnrichedItem[]): CardItem[] {
  const groups = new Map<string, EnrichedItem[]>();
  const out: CardItem[] = [];

  for (const item of items) {
    if (isEpisode(item.relPath)) {
      const name = seriesName(item.relPath);
      if (name) {
        const g = groups.get(name);
        if (g) g.push(item);
        else groups.set(name, [item]);
        continue;
      }
    }
    out.push(toCard(item));
  }

  for (const [name, eps] of groups) {
    if (eps.length >= 2) out.push(toSeriesCard(name, eps));
    else out.push(toCard(eps[0]));
  }

  out.sort((a, b) => (a.meta?.title || a.title).localeCompare(b.meta?.title || b.title));
  return out;
}

/** Episodes belonging to a series id (from a series card), sorted naturally. */
export async function getSeriesEpisodes(
  id: string,
  who = "corey"
): Promise<{ name: string; episodes: EnrichedItem[] } | null> {
  const rel = decodeId(id);
  if (!rel || !rel.startsWith(SERIES_PREFIX)) return null;
  const name = rel.slice(SERIES_PREFIX.length);
  const all = await getCatalog(who);
  const episodes = all
    .filter((i) => isEpisode(i.relPath) && seriesName(i.relPath) === name)
    .sort((a, b) => a.relPath.localeCompare(b.relPath, undefined, { numeric: true }));
  return episodes.length ? { name, episodes } : null;
}

/** The id of the next episode in the same series (for autoplay), or null. */
export async function nextEpisodeId(currentId: string): Promise<string | null> {
  const item = await getEnrichedItem(currentId);
  if (!item || !isEpisode(item.relPath)) return null;
  const name = seriesName(item.relPath);
  const eps = (await getCatalog())
    .filter((i) => isEpisode(i.relPath) && seriesName(i.relPath) === name)
    .sort((a, b) => a.relPath.localeCompare(b.relPath, undefined, { numeric: true }));
  const idx = eps.findIndex((e) => e.id === currentId);
  return idx >= 0 && idx + 1 < eps.length ? eps[idx + 1].id : null;
}

/** Server-side search + pagination over the (cached) catalog. */
export async function searchCatalog(
  who: string,
  q: string,
  offset: number,
  limit: number
): Promise<{ total: number; items: CardItem[] }> {
  const grouped = groupCatalog(await getCatalog(who));
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? grouped.filter((c) => (c.meta?.title || c.title).toLowerCase().includes(needle))
    : grouped;
  return {
    total: filtered.length,
    items: filtered.slice(offset, offset + limit),
  };
}
