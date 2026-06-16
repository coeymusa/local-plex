import { refreshMetadata } from "@/lib/catalog";
import { tmdbEnabled } from "@/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!tmdbEnabled()) {
    return Response.json(
      { ok: false, error: "TMDB_API_KEY not set — add it to .env.local and restart." },
      { status: 400 }
    );
  }
  const result = await refreshMetadata();
  return Response.json({ ok: true, ...result });
}
