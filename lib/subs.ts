import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { FFMPEG, FFPROBE } from "./ffmpeg";

export type SubTrack = {
  /** "e<n>" = embedded stream n, "x<n>" = external sibling file n. */
  track: string;
  label: string;
  lang: string;
  /** External filename (internal; not needed by the client). */
  file?: string;
};

const TEXT_SUB = new Set(["subrip", "srt", "ass", "ssa", "mov_text", "webvtt", "text"]);
const EXT_SUB = new Set([".srt", ".vtt", ".ass", ".ssa"]);

/** List subtitle tracks: embedded text streams + sibling external files. */
export async function listSubtitles(file: string): Promise<SubTrack[]> {
  const tracks: SubTrack[] = [];

  try {
    const json = await ffprobeJson(file);
    let n = 0;
    for (const s of json.streams ?? []) {
      if (s.codec_type !== "subtitle") continue;
      const idx = n++;
      if (!TEXT_SUB.has(String(s.codec_name))) continue;
      const lang = s.tags?.language || "und";
      tracks.push({ track: `e${idx}`, lang, label: s.tags?.title || langLabel(lang) });
    }
  } catch {
    /* no embedded */
  }

  try {
    const dir = path.dirname(file);
    const base = path.basename(file).replace(/\.[^.]+$/, "").toLowerCase();
    const entries = await fs.readdir(dir);
    let x = 0;
    for (const name of entries.sort()) {
      const ext = path.extname(name).toLowerCase();
      if (!EXT_SUB.has(ext)) continue;
      const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
      if (!stem.startsWith(base) && !base.startsWith(stem.split(".")[0])) continue;
      const langMatch = /\.([a-z]{2,3})$/i.exec(name.replace(/\.[^.]+$/, ""));
      const lang = langMatch ? langMatch[1].toLowerCase() : "und";
      tracks.push({ track: `x${x++}`, lang, label: `${langLabel(lang)} (file)`, file: name });
    }
  } catch {
    /* no externals */
  }

  return tracks;
}

/** Stream a resolved subtitle track as WebVTT. */
export function subtitleStream(videoFile: string, sub: SubTrack): ReadableStream<Uint8Array> {
  const args = sub.track.startsWith("e")
    ? ["-hide_banner", "-loglevel", "error", "-i", videoFile, "-map", `0:s:${sub.track.slice(1)}`, "-f", "webvtt", "pipe:1"]
    : ["-hide_banner", "-loglevel", "error", "-i", path.join(path.dirname(videoFile), sub.file!), "-f", "webvtt", "pipe:1"];

  const ps = spawn(FFMPEG, args);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      ps.stdout.on("data", (c: Buffer) => controller.enqueue(new Uint8Array(c)));
      ps.stdout.on("end", () => controller.close());
      ps.on("error", (e) => controller.error(e));
    },
    cancel() {
      ps.kill("SIGKILL");
    },
  });
}

function ffprobeJson(file: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ps = spawn(FFPROBE, ["-v", "quiet", "-print_format", "json", "-show_streams", file]);
    let out = "";
    ps.stdout.on("data", (d) => (out += d));
    ps.on("error", reject);
    ps.on("close", () => {
      try { resolve(JSON.parse(out)); } catch (e) { reject(e); }
    });
  });
}

function langLabel(code: string): string {
  const map: Record<string, string> = {
    en: "English", eng: "English", es: "Spanish", spa: "Spanish", fr: "French", fre: "French",
    de: "German", ger: "German", it: "Italian", ita: "Italian", ja: "Japanese", jpn: "Japanese",
    pt: "Portuguese", ru: "Russian", zh: "Chinese", ko: "Korean", ar: "Arabic", und: "Subtitles",
  };
  return map[code] || code.toUpperCase();
}
