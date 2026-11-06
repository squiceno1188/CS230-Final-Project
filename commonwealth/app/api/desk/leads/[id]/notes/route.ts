import { addNote, isLeadId } from "@/lib/leads";
import { deskGuard } from "@/lib/guard";
import { redirectTo, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return redirectTo("/desk");
  const denied = deskGuard(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!isLeadId(id)) return redirectTo("/desk");
  const form = await request.formData();
  const body = clean(String(form.get("body") ?? ""), 2000);
  const author = cleanAuthor(String(form.get("author") ?? ""));
  if (!body) return redirectTo(`/desk/${id}?error=note`);
  const ok = await addNote(id, body, author);
  return redirectTo(ok ? `/desk/${id}` : "/desk");
}

function clean(value: string, max: number) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function cleanAuthor(value: string) {
  const cleaned = value.replace(/[^\p{L}\p{N} .'’-]/gu, "").trim().slice(0, 60);
  return cleaned || "Desk";
}
