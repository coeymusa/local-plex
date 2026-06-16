import { COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
  res.headers.append(
    "Set-Cookie",
    `homehome_who=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
  return res;
}
