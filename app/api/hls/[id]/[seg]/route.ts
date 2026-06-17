import { resolveSafePath } from "@/lib/library";
import { probe, buildPlaylist, transcodeSegment, useHardware } from "@/lib/ffmpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanInfo = { durationSec: number; hw: boolean; targetHeight: number };
// Cache the probe result per id so we don't re-run ffprobe for every segment.
const planCache = new Map<string, PlanInfo>();

async function getPlan(id: string, file: string): Promise<PlanInfo> {
  const cached = planCache.get(id);
  if (cached) return cached;
  const p = await probe(file);
  const plan: PlanInfo = {
    durationSec: p.durationSec,
    hw: useHardware(p),
    targetHeight: Math.min(720, p.height ?? 720),
  };
  planCache.set(id, plan);
  return plan;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; seg: string }> }
) {
  const { id, seg } = await ctx.params;
  const file = resolveSafePath(id);
  if (!file) return new Response("Bad id", { status: 400 });

  let plan: PlanInfo;
  try {
    plan = await getPlan(id, file);
  } catch {
    return new Response("Could not probe file (is the NAS connected?)", { status: 500 });
  }

  // Playlist
  if (seg === "index.m3u8") {
    return new Response(buildPlaylist(plan.durationSec), {
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
    const stream = transcodeSegment(file, index, {
      hw: plan.hw,
      targetHeight: plan.targetHeight,
    });
    return new Response(stream, {
      headers: { "Content-Type": "video/mp2t", "Cache-Control": "no-store" },
    });
  }

  return new Response("Not found", { status: 404 });
}
