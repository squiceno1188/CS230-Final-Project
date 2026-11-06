import { areaNames } from "./areas";
import { bedsLabel, BUDGETS, FINANCING, labelOf, MOTIVATIONS, OCCUPANCY, PROPERTY_TYPES, TIMELINES } from "./options";
import type { Lead } from "./types";

export function money(value: number | null | undefined) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function budgetPhrase(min: number | null, max: number | null) {
  if (min != null && max != null) return `${money(min)}–${money(max)}`;
  if (max != null) return `Under ${money(max)}`;
  if (min != null) return `${money(min)} and up`;
  return "";
}

export function formatWhen(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatted} ET`;
}

export function whereLabel(lead: Pick<Lead, "kind" | "areas" | "address" | "city">) {
  if (lead.kind === "seller") {
    const street = [lead.address, lead.city].filter(Boolean).join(", ");
    return street || areaNames(lead.areas).join(", ");
  }
  return areaNames(lead.areas).join(", ");
}

export function leadSummary(lead: Lead) {
  if (lead.kind === "buyer") {
    return [bedsLabel(lead.beds), lead.propertyTypes.map((id) => labelOf(PROPERTY_TYPES, id)).filter(Boolean).join(" / "), budgetPhrase(lead.budgetMin, lead.budgetMax)]
      .filter(Boolean)
      .join(" · ");
  }
  return [bedsLabel(lead.beds), labelOf(PROPERTY_TYPES, lead.propertyType), lead.baths ? `${lead.baths} bath` : ""].filter(Boolean).join(" · ");
}

export function timelineLabel(id: string) {
  return labelOf(TIMELINES, id);
}

export function financingLabel(id: string | null) {
  return labelOf(FINANCING, id);
}

export function motivationLabel(id: string) {
  return labelOf(MOTIVATIONS, id);
}

export function occupancyLabel(id: string) {
  return labelOf(OCCUPANCY, id);
}

export function budgetIdLabel(id: string) {
  return labelOf(BUDGETS, id);
}
