export type ParsedName = {
  title: string;
  year: number | null;
  /** "tv" if it looks like SxxEyy, else "movie". */
  kind: "movie" | "tv";
  season: number | null;
  episode: number | null;
};

// Junk tokens commonly found in release names — title ends at the first one.
const JUNK =
  /\b(1080p|2160p|720p|480p|4k|uhd|bluray|blu-ray|brrip|bdrip|webrip|web-dl|webdl|web|hdrip|dvdrip|hdtv|x264|x265|h264|h265|hevc|avc|aac|ac3|dts|ddp?5\.1|atmos|remux|proper|repack|extended|unrated|imax|hdr|dv|amzn|nf|hmax|dsnp|yify|rarbg)\b/i;

function normalize(s: string): string {
  return s.replace(/[._]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function cleanup(s: string): string {
  let t = normalize(s);
  t = t.replace(/^(?:[[(][^\])]*[\])]\s*)+/, ""); // strip leading [group]/(group)
  t = t.replace(/\s*[[(][^\])]*[\])]\s*$/, ""); // strip trailing (group)
  t = t.replace(/^[-–—\s]+|[-–—\s]+$/g, ""); // trim stray dashes
  return t.replace(/\s{2,}/g, " ").trim();
}

function yearIn(s: string): number | null {
  const m = /\b(19\d{2}|20\d{2})\b/.exec(s);
  return m ? parseInt(m[1], 10) : null;
}

/** Parse a single name (filename or folder, no extension assumptions removed). */
export function parseFilename(filename: string): ParsedName {
  const name = normalize(filename.replace(/\.[^.]+$/, ""));

  const ep = /\b(?:s(\d{1,2})e(\d{1,2})|(\d{1,2})x(\d{1,2}))\b/i.exec(name);
  if (ep) {
    return {
      title: cleanup(name.slice(0, ep.index)),
      year: yearIn(name),
      kind: "tv",
      season: parseInt(ep[1] ?? ep[3], 10),
      episode: parseInt(ep[2] ?? ep[4], 10),
    };
  }

  const yearMatch = /\b(19\d{2}|20\d{2})\b/.exec(name);
  const junkMatch = JUNK.exec(name);
  const cut = Math.min(
    yearMatch ? yearMatch.index : Infinity,
    junkMatch ? junkMatch.index : Infinity
  );
  const title = cleanup(Number.isFinite(cut) ? name.slice(0, cut) : name);

  return {
    title: title || cleanup(name),
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    kind: "movie",
    season: null,
    episode: null,
  };
}

const GENERIC_FOLDER =
  /^(season[\s._-]*\d+|s\d{1,2}|disc[\s._-]*\d+|cd\d+|extras?|specials?|subs?|sample|video_ts|bdmv)$/i;

/**
 * Folder-aware parse. Media is usually organised as
 *   "Movie Name (2013) [release tags]/file.mkv"  or  "Show/Season 1/ep.mkv",
 * so the clean title often lives in a *folder*, not the filename. Pick the best
 * path component (one with a year, or a non-generic parent) for the title, but
 * keep episode info from the filename.
 */
export function parsePath(relPath: string): ParsedName {
  const parts = relPath.split("/");
  const fileBase = (parts.at(-1) ?? "").replace(/\.[^.]+$/, "");
  const parent = parts.at(-2) ?? "";
  const grand = parts.at(-3) ?? "";

  const fileParsed = parseFilename(fileBase);
  const hasYear = (s: string) => /\b(19|20)\d{2}\b/.test(s);
  const generic = (s: string) => GENERIC_FOLDER.test(normalize(s));

  let basis = fileBase;
  if (hasYear(fileBase)) basis = fileBase;
  else if (hasYear(parent)) basis = parent;
  else if (hasYear(grand)) basis = grand;
  else if (parent && !generic(parent)) basis = parent;
  else if (grand && !generic(grand)) basis = grand;

  const basisParsed = parseFilename(basis);

  if (fileParsed.kind === "tv") {
    return {
      title: basisParsed.title || fileParsed.title,
      year: basisParsed.year ?? fileParsed.year,
      kind: "tv",
      season: fileParsed.season,
      episode: fileParsed.episode,
    };
  }
  return basisParsed.title ? basisParsed : fileParsed;
}
