import { resolveSafePath } from "@/lib/library";
import { probe, buildPlaylist, transcodeSegment } from "@/lib/ffmpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache probed duration per id so we don't re-run ffprobe for every segment.
const durationCache = new Map<string, number>();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; seg: string }> }
) {
  const { id, seg } = await ctx.params;
  const file = resolveSafePath(id);
  if (!file) return new Response("Bad id", { status: 400 });

  // Playlist
  if (seg === "index.m3u8") {
    let dur = durationCache.get(id);
    if (dur === undefined) {
      try {
        dur = (await probe(file)).durationSec;
        durationCache.set(id, dur);
      } catch {
        return new Response("Could not probe file (is the NAS connected?)", {
          status: 500,
        });
      }
    }
    return new Response(buildPlaylist(dur), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
      },
    });
  }

  // Segment: "<n>.ts"
  const m = /^(\d+)\.ts$/.exec(seg);
  if (m) {
    const index = parseInt(m[1], 10);
    const stream = transcodeSegment(file, index);
    return new Response(stream, {
      headers: {
        "Content-Type": "video/mp2t",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Not found", { status: 404 });
}
