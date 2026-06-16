import { checkPassword, makeToken, COOKIE_NAME, authEnabled } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!authEnabled()) return Response.json({ ok: true });

  // Blunt brute-force protection: 10 attempts per IP per 5 minutes.
  const limit = rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let password = "";
  try {
    password = (await req.json()).password ?? "";
  } catch {
    /* ignore */
  }

  if (!checkPassword(password)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  // Mark the cookie Secure when the browser reached us over HTTPS (e.g. behind
  // the Cloudflare tunnel, which forwards X-Forwarded-Proto: https).
  const proto = req.headers.get("x-forwarded-proto");
  const secure = proto === "https" ? " Secure;" : "";

  const token = await makeToken();
  const res = Response.json({ ok: true });
  const maxAge = 60 * 60 * 24 * 30;
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly;${secure} Path=/; SameSite=Lax; Max-Age=${maxAge}`
  );
  // Password login = full library (clears any prior "julia" personalization).
  res.headers.append(
    "Set-Cookie",
    `homehome_who=corey; HttpOnly;${secure} Path=/; SameSite=Lax; Max-Age=${maxAge}`
  );
  return res;
}
