import { createLead } from "@/lib/leads";
import { clientIp, noStore, rateLimit, sameOrigin } from "@/lib/http";
import { parseInquiry } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return noStore({ error: "Forbidden" }, 403);
  const ip = clientIp(request);
  if (!rateLimit(`inquiry:${ip}`, 8, 10 * 60 * 1000) || !rateLimit(`inquiry-day:${ip}`, 40, 24 * 60 * 60 * 1000)) {
    return noStore({ error: "Too many inquiries from this network. Try again later." }, 429);
  }
  const raw = await request.text();
  if (raw.length > 20_000) return noStore({ error: "That inquiry is too long." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return noStore({ error: "That inquiry could not be read." }, 400);
  }
  const parsed = parseInquiry(body);
  if (!parsed.ok) return noStore({ error: parsed.error }, 400);
  if (parsed.spam) return noStore({ ok: true });
  try {
    await createLead(parsed.value, { source: parsed.source, sourceDetail: parsed.sourceDetail });
  } catch {
    console.error("inquiry insert failed");
    return noStore({ error: "We could not save that inquiry. Try again." }, 500);
  }
  return noStore({ ok: true });
}
