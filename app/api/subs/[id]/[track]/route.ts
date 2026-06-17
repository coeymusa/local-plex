import { resolveSafePath } from "@/lib/library";
import { listSubtitles, subtitleStream } from "@/lib/subs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; track: string }> }
) {
  const { id, track } = await ctx.params;
  const file = resolveSafePath(id);
  if (!file) return new Response("Bad id", { status: 400 });

  const subs = await listSubtitles(file);
  const sub = subs.find((s) => s.track === track);
  if (!sub) return new Response("No such subtitle", { status: 404 });

  return new Response(subtitleStream(file, sub), {
    headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "no-store" },
  });
}
