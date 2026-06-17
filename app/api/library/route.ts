import { searchCatalog } from "@/lib/catalog";
import { currentWho } from "@/lib/who";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(120, Math.max(1, parseInt(url.searchParams.get("limit") ?? "60", 10) || 60));

  const result = await searchCatalog(await currentWho(), q, offset, limit);
  return Response.json(result);
}
