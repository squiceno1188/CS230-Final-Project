import { loadSamples } from "@/lib/leads";
import { deskGuard } from "@/lib/guard";
import { redirectTo, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return redirectTo("/desk");
  const denied = deskGuard(request);
  if (denied) return denied;
  try {
    await loadSamples();
  } catch {
    console.error("sample load failed");
    return redirectTo("/desk?error=samples");
  }
  return redirectTo("/desk");
}
