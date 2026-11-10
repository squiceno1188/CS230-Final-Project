import { clearCookie } from "@/lib/auth";
import { redirectTo, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return redirectTo("/desk");
  return redirectTo("/desk/login", clearCookie());
}
