import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "desk_session";

export function isHosted() {
  return Boolean(process.env.CURSOR_APP_ID?.trim() || process.env.VERCEL);
}

export function expectedCode() {
  return (process.env.DESK_ACCESS_CODE ?? "").trim();
}

export function deskConfigured() {
  return expectedCode() !== "";
}

export function deskUnlockedLocally() {
  return !deskConfigured() && !isHosted();
}

export function sessionMatches(value: string | undefined | null) {
  if (deskUnlockedLocally()) return true;
  const code = expectedCode();
  if (!code || !value) return false;
  const expected = sign(code);
  const actual = Buffer.from(value);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export async function deskAllowed() {
  if (deskUnlockedLocally()) return true;
  const jar = await cookies();
  return sessionMatches(jar.get(COOKIE)?.value);
}

export function cookieFromHeader(header: string | null) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === COOKIE) return trimmed.slice(eq + 1);
  }
  return undefined;
}

export function requireDesk(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return locked(403);
  if (sessionMatches(cookieFromHeader(request.headers.get("cookie")))) return null;
  return locked(401);
}

export function sessionCookie(maxAge = 60 * 60 * 24 * 14) {
  const value = sign(expectedCode());
  const secure = isHosted() ? "; Secure" : "";
  return `${COOKIE}=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function clearCookie() {
  const secure = isHosted() ? "; Secure" : "";
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`;
}

export function codesMatch(given: string, expected: string) {
  const left = createHash("sha256").update(given).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function sign(code: string) {
  return createHmac("sha256", code).update("commonwealth-desk-v1").digest("base64url");
}

function locked(status: number) {
  return Response.json(
    { error: status === 403 ? "Forbidden" : "The desk is locked." },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}
