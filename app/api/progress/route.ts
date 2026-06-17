import { getDb } from "@/lib/db";
import { currentWho } from "@/lib/who";

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

  // Store per viewer so Julia and Corey keep separate resume positions.
  const who = await currentWho();
  getDb().prepare(
    `INSERT INTO progress (id, position, duration, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       position=excluded.position, duration=excluded.duration, updated_at=excluded.updated_at`
  ).run(`${who}:${id}`, position, duration, Date.now());

  return Response.json({ ok: true });
}
