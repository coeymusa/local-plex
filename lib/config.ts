import path from "node:path";

/**
 * Where your media lives.
 *
 * Phase 1: defaults to the local ./media folder so the app runs out of the box.
 * Later, point this at your NAS by setting MEDIA_DIR in .env.local, e.g.
 *   MEDIA_DIR=\\\\192.168.178.64\\Media       (Windows UNC path to HomeHome)
 * or, if you map the share to a drive letter:
 *   MEDIA_DIR=Z:\\
 */
export const MEDIA_DIR = path.resolve(
  process.env.MEDIA_DIR ?? path.join(process.cwd(), "media")
);

/** Extensions a browser can usually play directly, no transcoding needed. */
export const DIRECT_PLAY_EXTS = new Set([".mp4", ".m4v", ".webm", ".mov"]);

/** Everything else we treat as video but flag as "needs transcoding" (Phase 4). */
export const VIDEO_EXTS = new Set([
  ...DIRECT_PLAY_EXTS,
  ".mkv",
  ".avi",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
  ".ts",
  ".m2ts",
]);
