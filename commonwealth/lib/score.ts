import { getArea } from "./areas";
import type { ParsedInquiry, Reason } from "./types";

const TIMELINE_POINTS: Record<string, number> = {
  asap: 30,
  "1-3": 24,
  "3-6": 14,
  "6-12": 8,
  browsing: 3,
};

const TIMELINE_LABEL: Record<string, string> = {
  asap: "Ready now",
  "1-3": "1–3 months",
  "3-6": "3–6 months",
  "6-12": "6–12 months",
  browsing: "Researching, no date",
};

export function scoreBand(score: number) {
  if (score >= 70) return "High priority";
  if (score >= 45) return "Warm";
  return "Early";
}

export function scoreInquiry(input: ParsedInquiry): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const add = (points: number, label: string) => {
    reasons.push({ points, label });
  };

  const timing = TIMELINE_POINTS[input.timeline] ?? 0;
  if (timing) add(timing, `Timing: ${TIMELINE_LABEL[input.timeline] ?? input.timeline}`);

  if (input.kind === "buyer") scoreBuyer(input, add);
  else scoreSeller(input, add);

  if (input.notes.trim().length >= 8) add(3, "Left a note");
  if (input.preferredContact === "phone") add(3, "Prefers a phone call");
  if (input.email && input.phone) add(4, "Phone and email are both on file");

  const raw = reasons.reduce((sum, reason) => sum + reason.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  if (score !== raw) {
    reasons.push({ points: score - raw, label: score === 100 ? "Capped at 100" : "Held at 0" });
  }
  return { score, reasons };
}

function scoreBuyer(input: ParsedInquiry, add: (points: number, label: string) => void) {
  if (input.financing === "cash") add(22, "Paying cash");
  else if (input.financing === "preapproved") add(18, "Pre-approved");
  else if (input.financing === "talking") add(8, "Already talking with a lender");
  else if (input.financing === "exploring") add(3, "Still exploring financing");

  const count = input.areas.length;
  if (count >= 1 && count <= 3) add(10, count === 1 ? "Focused on one place" : `Focused on ${count} places`);
  else if (count > 3) add(6, "Looking across several places");

  if (input.budgetMin != null || input.budgetMax != null) add(8, "Budget is set");

  const ceiling = input.budgetMax ?? (input.budgetMin != null ? input.budgetMin + 800_000 : null);
  const picked = input.areas.map((slug) => getArea(slug)).filter((area) => area != null);
  if (ceiling != null && picked.length > 0) {
    const fits = picked.filter((area) => ceiling >= area.band.low);
    const tight = picked.filter((area) => ceiling < area.band.low);
    if (fits.length > 0) add(8, `Budget reaches the planning band in ${names(fits.map((area) => area.name))}`);
    else add(-8, `Budget is below the planning band in ${names(tight.map((area) => area.name))}`);
    if (fits.length > 0 && tight.length > 0) add(0, `Budget is tight for ${names(tight.map((area) => area.name))}`);
  }

  if (input.beds != null) add(4, "Bedrooms are set");
  if (input.mustHaves.trim().length >= 8) add(4, "Must-haves are specific");
}

function scoreSeller(input: ParsedInquiry, add: (points: number, label: string) => void) {
  const motivation: Record<string, [number, string]> = {
    relocating: [18, "Relocating"],
    "already-bought": [18, "Already bought the next place"],
    estate: [18, "Estate or probate"],
    financial: [18, "Financial change"],
    upsizing: [12, "Needs a larger home"],
    downsizing: [12, "Downsizing"],
    curious: [4, "Curious what it would sell for"],
  };
  const motive = motivation[input.motivation];
  if (motive) add(motive[0], motive[1]);

  if (input.occupancy === "vacant") add(10, "Property is vacant");
  else if (input.occupancy === "owner") add(5, "Owner lives there");
  else if (input.occupancy === "tenant") add(3, "Tenants are in place");

  if (input.address.trim().length >= 5) add(8, "Street address is included");
  if (input.propertyType) add(3, "Property type is set");

  const area = getArea(input.areas[0] ?? "");
  const price = input.priceExpectation;
  if (area && price != null) {
    if (price >= area.band.low * 0.75 && price <= area.band.high * 1.25) {
      add(6, "Price expectation sits in a discussable range for the planning band");
    } else if (price > area.band.high * 1.25) {
      add(2, "Price expectation is above the planning band");
    } else {
      add(2, "Price expectation is below the planning band");
    }
  }
}

function names(items: string[]) {
  return items.slice(0, 3).join(", ");
}
