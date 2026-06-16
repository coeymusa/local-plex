/**
 * Minimal password gate for home use.
 *
 * Set APP_PASSWORD in .env.local to turn it on. A correct password mints a
 * signed bearer token stored in an httpOnly cookie. If APP_PASSWORD is unset,
 * auth is disabled (fine on a trusted LAN; Phase 3's Tailscale is the real
 * "keep it off the public internet" layer).
 *
 * Uses only Web Crypto so it runs in both middleware and route handlers.
 */

export const COOKIE_NAME = "homehome_auth";

const PASSWORD = process.env.APP_PASSWORD;
const SECRET = process.env.AUTH_SECRET || PASSWORD || "";

export function authEnabled(): boolean {
  return Boolean(PASSWORD);
}

export function checkPassword(input: string): boolean {
  return authEnabled() && timingSafeEqual(input, PASSWORD!);
}

export async function makeToken(): Promise<string> {
  return hmac(SECRET, "homehome.v1");
}

export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!token) return false;
  const expected = await makeToken();
  return timingSafeEqual(token, expected);
}

async function hmac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return toHex(new Uint8Array(sig));
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
