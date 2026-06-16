import { makeToken, COOKIE_NAME, authEnabled } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

// The "Are you Julia?" gate — an alternative to the password. The correct
// answers are read from environment variables (set in .env, gitignored) so they
// aren't committed to source. Defaults are placeholders that match nothing real.
const CORRECT_LOLLIPOP = (process.env.QUIZ_LOLLIPOP ?? "__unset__").toLowerCase();
const CORRECT_PASTA = (process.env.QUIZ_PASTA ?? "__unset__").toLowerCase();
const CORRECT_NYC = (process.env.QUIZ_NYC ?? "__unset__").toLowerCase();
const REQUIRED_GREATNESS = Number(process.env.QUIZ_GREATNESS ?? "10");

export async function POST(req: Request) {
  if (!authEnabled()) return Response.json({ ok: true });

  const limit = rateLimit(`quiz:${clientIp(req)}`, 10, 5 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { ok: false, error: "Too many tries. Give it a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let lollipop = "";
  let pasta = "";
  let nyc = "";
  let greatness = 0;
  try {
    const body = await req.json();
    lollipop = String(body.lollipop ?? "");
    pasta = String(body.pasta ?? "");
    nyc = String(body.nyc ?? "");
    greatness = Number(body.greatness ?? 0);
  } catch {
    /* ignore */
  }

  if (lollipop !== CORRECT_LOLLIPOP) {
    return Response.json({ ok: false, reason: "lollipop" }, { status: 401 });
  }
  if (pasta !== CORRECT_PASTA) {
    return Response.json({ ok: false, reason: "pasta" }, { status: 401 });
  }
  if (nyc !== CORRECT_NYC) {
    return Response.json({ ok: false, reason: "nyc" }, { status: 401 });
  }
  if (greatness !== REQUIRED_GREATNESS) {
    return Response.json({ ok: false, reason: "greatness" }, { status: 401 });
  }

  const proto = req.headers.get("x-forwarded-proto");
  const secure = proto === "https" ? " Secure;" : "";

  const token = await makeToken();
  const maxAge = 60 * 60 * 24 * 30;
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly;${secure} Path=/; SameSite=Lax; Max-Age=${maxAge}`
  );
  // Mark this session as Julia so the home page shows her curated screen.
  res.headers.append(
    "Set-Cookie",
    `homehome_who=julia; HttpOnly;${secure} Path=/; SameSite=Lax; Max-Age=${maxAge}`
  );
  return res;
}
