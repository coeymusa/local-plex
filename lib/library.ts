import fs from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR, VIDEO_EXTS, DIRECT_PLAY_EXTS } from "./config";

export type MediaItem = {
  /** Opaque, URL-safe id derived from the file's path relative to MEDIA_DIR. */
  id: string;
  /** Human-ish title cleaned from the filename (real metadata comes in Phase 2). */
  title: string;
  /** Path relative to MEDIA_DIR, using forward slashes. */
  relPath: string;
  ext: string;
  sizeBytes: number;
  /** True if a browser can likely play it without transcoding. */
  directPlay: boolean;
};

/** Encode a relative path into an opaque, URL-safe id. */
export function encodeId(relPath: string): string {
  return Buffer.from(relPath, "utf8").toString("base64url");
}

/** Decode an id back to a relative path. Returns null if malformed. */
export function decodeId(id: string): string | null {
  try {
    const rel = Buffer.from(id, "base64url").toString("utf8");
    return rel.length > 0 ? rel : null;
  } catch {
    return null;
  }
}

/**
 * Resolve an id to an absolute path on disk, guaranteeing the result stays
 * inside MEDIA_DIR (defends against path-traversal via crafted ids).
 */
export function resolveSafePath(id: string): string | null {
  const rel = decodeId(id);
  if (rel === null) return null;
  const abs = path.resolve(MEDIA_DIR, rel);
  const root = path.resolve(MEDIA_DIR);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

/** Turn "The.Matrix.1999.1080p.mkv" into "The Matrix 1999 1080p". */
function cleanTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[._]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Recursively scan MEDIA_DIR for video files. */
export async function scanLibrary(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable dir (e.g. NAS offline) — skip quietly
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip Synology system dirs: recycle bin + thumbnail/index store.
        if (entry.name === "#recycle" || entry.name === "@eaDir") continue;
        await walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!VIDEO_EXTS.has(ext)) continue;
        let sizeBytes = 0;
        try {
          sizeBytes = (await fs.stat(full)).size;
        } catch {
          continue;
        }
        const relPath = path.relative(MEDIA_DIR, full).split(path.sep).join("/");
        items.push({
          id: encodeId(relPath),
          title: cleanTitle(entry.name),
          relPath,
          ext,
          sizeBytes,
          directPlay: DIRECT_PLAY_EXTS.has(ext),
        });
      }
    }
  }

  await walk(MEDIA_DIR);
  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
}

// --- Scan cache -------------------------------------------------------------
// Walking 6,000+ files over SMB takes seconds, so cache the file list and reuse
// it for a short window. Metadata and resume progress are joined fresh on top
// (they come from local SQLite and are cheap), so only the NAS walk is cached.
let scanCache: { items: MediaItem[]; at: number } | null = null;
// Media changes rarely; keep the (now @eaDir-free) scan warm for a while so
// page loads stay fast. Busted explicitly after a metadata refresh.
const SCAN_TTL_MS = 15 * 60_000;

export async function scanLibraryCached(force = false): Promise<MediaItem[]> {
  const now = Date.now();
  if (!force && scanCache && now - scanCache.at < SCAN_TTL_MS) {
    return scanCache.items;
  }
  const items = await scanLibrary();
  scanCache = { items, at: now };
  return items;
}

/** Drop the cached file list (call after a change that adds/removes files). */
export function bustScanCache(): void {
  scanCache = null;
}

/** Find a single item by id (used by the watch page). */
export async function getItem(id: string): Promise<MediaItem | null> {
  const all = await scanLibraryCached();
  return all.find((i) => i.id === id) ?? null;
}
