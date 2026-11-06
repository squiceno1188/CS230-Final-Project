import { areaNames } from "@/lib/areas";
import { requireDesk } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { budgetPhrase, formatWhen, timelineLabel } from "@/lib/format";
import { redirectTo } from "@/lib/http";
import { leadsForExport } from "@/lib/leads";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (requireDesk(request)) return redirectTo("/desk/login");
  const rows = await leadsForExport();
  const csv = toCsv([
    ["created_et", "kind", "status", "score", "first_name", "last_name", "email", "phone", "preferred_contact", "places", "timeline", "budget_or_expectation", "address", "city", "motivation", "financing", "note", "agent_notes", "source", "sample"],
    ...rows.map(({ lead, notes }) => [
      formatWhen(lead.createdAt),
      lead.kind,
      lead.status,
      String(lead.score),
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.phone,
      lead.preferredContact,
      areaNames(lead.areas).join("; "),
      timelineLabel(lead.timeline),
      lead.kind === "buyer" ? budgetPhrase(lead.budgetMin, lead.budgetMax) : lead.priceExpectation ? String(lead.priceExpectation) : "",
      lead.address,
      lead.city,
      lead.motivation,
      lead.financing ?? "",
      lead.notesFromLead,
      notes.join(" | "),
      lead.source,
      lead.sample ? "yes" : "no",
    ]),
  ]);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="commonwealth-leads.csv"',
      "cache-control": "private, no-store",
    },
  });
}
