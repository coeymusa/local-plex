import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { id?: string; position?: number; duration?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const { id, position, duration } = body;
  if (typeof id !== "string" || typeof position !== "number" || typeof duration !== "number") {
    return Response.json({ ok: false }, { status: 400 });
  }

  getDb().prepare(
    `INSERT INTO progress (id, position, duration, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       position=excluded.position, duration=excluded.duration, updated_at=excluded.updated_at`
  ).run(id, position, duration, Date.now());

  return Response.json({ ok: true });
}
