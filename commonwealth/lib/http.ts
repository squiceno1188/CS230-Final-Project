const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw = (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "local").trim();
  return raw.slice(0, 80) || "local";
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.reset < now) buckets.delete(bucketKey);
    }
  }
  const existing = buckets.get(key);
  if (!existing || existing.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function noStore(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

export function redirectTo(location: string, cookie?: string) {
  const headers = new Headers({ location, "cache-control": "private, no-store" });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}
