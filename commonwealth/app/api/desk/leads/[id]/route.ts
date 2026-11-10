import { isLeadId, setStatus } from "@/lib/leads";
import { deskGuard } from "@/lib/guard";
import { redirectTo, sameOrigin } from "@/lib/http";
import { isStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return redirectTo("/desk");
  const denied = deskGuard(request);
  if (denied) return denied;
  const { id } = await context.params;
  const form = await request.formData();
  const status = String(form.get("status") ?? "");
  if (!isLeadId(id) || !isStatus(status)) return redirectTo("/desk");
  const ok = await setStatus(id, status);
  return redirectTo(ok ? `/desk/${id}` : "/desk");
}
