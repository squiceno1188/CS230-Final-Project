import { codesMatch, deskConfigured, expectedCode, isHosted, sessionCookie } from "@/lib/auth";
import { clientIp, rateLimit, redirectTo, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return redirectTo("/desk/login?error=1");
  if (!rateLimit(`login:${clientIp(request)}`, 8, 10 * 60 * 1000)) return redirectTo("/desk/login?error=rate");
  if (!deskConfigured()) {
    if (isHosted()) return redirectTo("/desk/login");
    return redirectTo("/desk");
  }
  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  if (code.length > 200 || !codesMatch(code, expectedCode())) return redirectTo("/desk/login?error=1");
  return redirectTo("/desk", sessionCookie());
}
