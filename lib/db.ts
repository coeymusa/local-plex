import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Store the SQLite file under .data/ (gitignored).
const DATA_DIR = path.join(process.cwd(), ".data");

// Reuse a single connection across hot-reloads in dev / route modules.
const g = globalThis as unknown as { __homehomeDb?: DatabaseSync };

function init(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "homehome.db"));
  // WAL + busy timeout let concurrent readers/writers coexist (e.g. multiple
  // Next build workers or simultaneous requests) instead of throwing "locked".
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      rel_path     TEXT PRIMARY KEY,
      tmdb_id      INTEGER,
      kind         TEXT,
      title        TEXT,
      year         INTEGER,
      overview     TEXT,
      poster_url   TEXT,
      backdrop_url TEXT,
      rating       REAL,
      genres       TEXT,
      ep_title     TEXT,
      ep_still     TEXT,
      fetched_at   INTEGER
    );
    CREATE TABLE IF NOT EXISTS progress (
      id         TEXT PRIMARY KEY,
      position   REAL NOT NULL,
      duration   REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  // Migrations for columns added after the table first shipped.
  for (const col of ["genres TEXT", "ep_title TEXT", "ep_still TEXT"]) {
    try {
      db.exec(`ALTER TABLE metadata ADD COLUMN ${col}`);
    } catch {
      /* column already exists */
    }
  }
  return db;
}

/** Lazily open the database on first use (never at import time). */
export function getDb(): DatabaseSync {
  return g.__homehomeDb ?? (g.__homehomeDb = init());
}

export type MetadataRow = {
  rel_path: string;
  tmdb_id: number | null;
  kind: string | null;
  title: string | null;
  year: number | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  genres: string | null;
  ep_title: string | null;
  ep_still: string | null;
  fetched_at: number | null;
};

export type ProgressRow = {
  id: string;
  position: number;
  duration: number;
  updated_at: number;
};
