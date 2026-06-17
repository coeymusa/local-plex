import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

/** Seconds per HLS segment. */
export const SEGMENT_SECONDS = 6;

// Hardware (VAAPI / Intel QuickSync) transcoding — used when the device is
// present and the source codec is GPU-decodable. Set HW_TRANSCODE=0 to disable.
const HW_DEVICE = "/dev/dri/renderD128";
const HW_ENABLED = process.env.HW_TRANSCODE !== "0" && existsSync(HW_DEVICE);
const HW_DECODE = new Set(["hevc", "h264", "vp9", "vp8", "mpeg2video", "vc1"]);

export type Probe = {
  durationSec: number;
  vcodec: string | null;
  acodec: string | null;
  height: number | null;
};

const OK_VIDEO = new Set(["h264", "vp8", "vp9", "av1"]);
const OK_AUDIO = new Set(["aac", "mp3", "opus", "vorbis", "flac"]);
const OK_CONTAINER = new Set([".mp4", ".m4v", ".mov", ".webm"]);

export function probe(file: string): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const ps = spawn(FFPROBE, [
      "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", file,
    ]);
    let out = "";
    let err = "";
    ps.stdout.on("data", (d) => (out += d));
    ps.stderr.on("data", (d) => (err += d));
    ps.on("error", reject);
    ps.on("close", (code) => {
      if (code !== 0) return reject(new Error(err || `ffprobe exited ${code}`));
      try {
        const json = JSON.parse(out);
        const v = json.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
        const a = json.streams?.find((s: { codec_type: string }) => s.codec_type === "audio");
        resolve({
          durationSec: parseFloat(json.format?.duration ?? "0") || 0,
          vcodec: v?.codec_name ?? null,
          acodec: a?.codec_name ?? null,
          height: typeof v?.height === "number" ? v.height : null,
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function canDirectPlay(file: string, p: Probe): boolean {
  const ext = path.extname(file).toLowerCase();
  return (
    OK_CONTAINER.has(ext) &&
    (p.vcodec === null || OK_VIDEO.has(p.vcodec)) &&
    (p.acodec === null || OK_AUDIO.has(p.acodec))
  );
}

/** Whether to hardware-decode this source on the GPU. */
export function useHardware(p: Probe): boolean {
  return HW_ENABLED && p.vcodec !== null && HW_DECODE.has(p.vcodec);
}

export function segmentCount(durationSec: number): number {
  return Math.max(1, Math.ceil(durationSec / SEGMENT_SECONDS));
}

export function buildPlaylist(durationSec: number): string {
  const count = segmentCount(durationSec);
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    `#EXT-X-TARGETDURATION:${SEGMENT_SECONDS}`,
    "#EXT-X-MEDIA-SEQUENCE:0",
  ];
  for (let i = 0; i < count; i++) {
    const len = i === count - 1 ? durationSec - i * SEGMENT_SECONDS : SEGMENT_SECONDS;
    lines.push(`#EXTINF:${len.toFixed(3)},`);
    lines.push(`${i}.ts`);
  }
  lines.push("#EXT-X-ENDLIST");
  return lines.join("\n") + "\n";
}

/**
 * Transcode one HLS segment to MPEG-TS (H.264 + AAC). Uses VAAPI hardware
 * decode+encode when `hw` is set (≈5× faster), otherwise libx264 software.
 */
export function transcodeSegment(
  file: string,
  index: number,
  opts: { hw: boolean; targetHeight: number } = { hw: false, targetHeight: 720 }
): ReadableStream<Uint8Array> {
  const start = index * SEGMENT_SECONDS;
  const h = Math.max(2, opts.targetHeight - (opts.targetHeight % 2)); // even

  const videoArgs = opts.hw
    ? [
        "-vf", `scale_vaapi=w=-2:h=${h}:format=nv12`,
        "-c:v", "h264_vaapi", "-qp", "23",
      ]
    : [
        "-vf", `scale=-2:${h}`,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-force_key_frames", "expr:gte(t,n_forced*" + SEGMENT_SECONDS + ")",
      ];

  const args = [
    "-hide_banner", "-loglevel", "error",
    ...(opts.hw
      ? ["-hwaccel", "vaapi", "-hwaccel_device", HW_DEVICE, "-hwaccel_output_format", "vaapi"]
      : []),
    "-ss", String(start),
    "-t", String(SEGMENT_SECONDS),
    "-copyts",
    "-i", file,
    ...videoArgs,
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-muxdelay", "0",
    "-f", "mpegts",
    "pipe:1",
  ];

  const ps = spawn(FFMPEG, args);
  let stderr = "";
  ps.stderr.on("data", (d) => (stderr += d));

  return new ReadableStream<Uint8Array>({
    start(controller) {
      ps.stdout.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      ps.stdout.on("end", () => controller.close());
      ps.on("error", (e) => controller.error(e));
      ps.on("close", (code) => {
        if (code !== 0 && code !== null) {
          controller.error(new Error(stderr || `ffmpeg exited ${code}`));
        }
      });
    },
    cancel() {
      ps.kill("SIGKILL");
    },
  });
}
