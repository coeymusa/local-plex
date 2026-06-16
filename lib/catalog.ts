import { getDb, type MetadataRow, type ProgressRow } from "./db";
import { scanLibrary, scanLibraryCached, type MediaItem } from "./library";
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

function progressMap(): Map<string, ProgressRow> {
  const rows = getDb().prepare("SELECT * FROM progress").all() as ProgressRow[];
  return new Map(rows.map((r) => [r.id, r]));
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

/** Full catalog with cached metadata + resume progress attached (no network). */
export async function getCatalog(): Promise<EnrichedItem[]> {
  const [items, metas, progs] = [await scanLibraryCached(), metaMap(), progressMap()];
  return items.map((i) => enrich(i, metas, progs));
}

export async function getEnrichedItem(id: string): Promise<EnrichedItem | null> {
  const items = await getCatalog();
  return items.find((i) => i.id === id) ?? null;
}

/** Items the user started but hasn't finished, newest first. */
export async function continueWatching(): Promise<EnrichedItem[]> {
  const all = await getCatalog();
  const progs = progressMap();
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
  meta: { title: string | null; year: number | null; poster_url: string | null } | null;
  progress: { pct: number } | null;
};

export function toCard(i: EnrichedItem): CardItem {
  return {
    id: i.id,
    title: i.title,
    ext: i.ext,
    sizeBytes: i.sizeBytes,
    directPlay: i.directPlay,
    meta: i.meta
      ? { title: i.meta.title, year: i.meta.year, poster_url: i.meta.poster_url }
      : null,
    progress: i.progress ? { pct: i.progress.pct } : null,
  };
}

/** Server-side search + pagination over the (cached) catalog. */
export async function searchCatalog(
  q: string,
  offset: number,
  limit: number
): Promise<{ total: number; items: CardItem[] }> {
  const all = await getCatalog();
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? all.filter((i) => (i.meta?.title || i.title).toLowerCase().includes(needle))
    : all;
  return {
    total: filtered.length,
    items: filtered.slice(offset, offset + limit).map(toCard),
  };
}
