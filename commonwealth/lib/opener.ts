import { areaNames } from "./areas";
import { budgetPhrase, timelineLabel } from "./format";
import type { Lead } from "./types";

export function opener(lead: Lead) {
  const name = lead.firstName;
  if (lead.kind === "buyer") {
    const places = areaNames(lead.areas).join(", ") || "Greater Boston";
    const budget = budgetPhrase(lead.budgetMin, lead.budgetMax);
    const budgetBit = budget ? `, around ${budget}` : "";
    const ready = lead.financing === "cash" ? " You mentioned cash, which keeps the timing simpler." : lead.financing === "preapproved" ? " You mentioned a pre-approval, which helps." : "";
    return `Hi ${name} — thank you for telling us you are looking in ${places}${budgetBit}. The next step is a short list matched to your timing (${timelineLabel(lead.timeline).toLowerCase()}).${ready} Would a 15-minute call this week be useful?`;
  }
  const where = [lead.address, lead.city].filter(Boolean).join(", ") || areaNames(lead.areas).join(", ") || "the property";
  return `Hi ${name} — thank you for asking about ${where}. I can walk through pricing, timing, and what similar homes in that part of Greater Boston have been doing. This would be a conversation, not an appraisal. Would 20 minutes this week work?`;
}
