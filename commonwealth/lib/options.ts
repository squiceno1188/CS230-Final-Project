export const TIMELINES = [
  { id: "asap", label: "Ready now, 0–30 days" },
  { id: "1-3", label: "1–3 months" },
  { id: "3-6", label: "3–6 months" },
  { id: "6-12", label: "6–12 months" },
  { id: "browsing", label: "Researching, no date" },
] as const;

export const FINANCING = [
  { id: "cash", label: "Cash" },
  { id: "preapproved", label: "Pre-approved" },
  { id: "talking", label: "Talking with a lender" },
  { id: "exploring", label: "Still exploring" },
] as const;

export const PROPERTY_TYPES = [
  { id: "condo", label: "Condo" },
  { id: "single", label: "Single-family" },
  { id: "townhouse", label: "Townhouse" },
  { id: "multi", label: "Multi-family" },
] as const;

export const BEDS = [
  { id: "0", label: "Studio" },
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3" },
  { id: "4", label: "4" },
  { id: "5", label: "5+" },
] as const;

export const BATHS = [
  { id: "1", label: "1" },
  { id: "1.5", label: "1.5" },
  { id: "2", label: "2" },
  { id: "2.5", label: "2.5" },
  { id: "3", label: "3" },
  { id: "3.5", label: "3.5" },
  { id: "4", label: "4+" },
] as const;

export const BUDGETS = [
  { id: "under-600", label: "Under $600k", min: null, max: 600_000 },
  { id: "600-900", label: "$600k–$900k", min: 600_000, max: 900_000 },
  { id: "900-1300", label: "$900k–$1.3M", min: 900_000, max: 1_300_000 },
  { id: "1300-1800", label: "$1.3M–$1.8M", min: 1_300_000, max: 1_800_000 },
  { id: "1800-2500", label: "$1.8M–$2.5M", min: 1_800_000, max: 2_500_000 },
  { id: "2500-up", label: "$2.5M and up", min: 2_500_000, max: null },
] as const;

export const SELLER_PRICES = [
  { id: "discuss", label: "I'd rather discuss it", value: null },
  { id: "under-600", label: "Under $600k", value: 500_000 },
  { id: "600-900", label: "$600k–$900k", value: 750_000 },
  { id: "900-1300", label: "$900k–$1.3M", value: 1_100_000 },
  { id: "1300-1800", label: "$1.3M–$1.8M", value: 1_550_000 },
  { id: "1800-2500", label: "$1.8M–$2.5M", value: 2_150_000 },
  { id: "2500-up", label: "$2.5M and up", value: 2_500_000 },
] as const;

export const MOTIVATIONS = [
  { id: "relocating", label: "Relocating for work or family" },
  { id: "upsizing", label: "Need a larger home" },
  { id: "downsizing", label: "Downsizing" },
  { id: "already-bought", label: "Already bought the next place" },
  { id: "estate", label: "Estate or probate" },
  { id: "financial", label: "Financial change" },
  { id: "curious", label: "Curious what it would sell for" },
] as const;

export const OCCUPANCY = [
  { id: "owner", label: "I live there" },
  { id: "tenant", label: "Tenants live there" },
  { id: "vacant", label: "It is vacant" },
] as const;

export const CONTACTS = [
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "either", label: "Either" },
] as const;

export function labelOf(list: readonly { id: string; label: string }[], id: string | null | undefined) {
  if (!id) return "";
  return list.find((item) => item.id === id)?.label ?? "";
}

export function bedsLabel(beds: number | null) {
  if (beds == null) return "";
  if (beds === 0) return "Studio";
  if (beds >= 5) return "5+ bedrooms";
  return beds === 1 ? "1 bedroom" : `${beds} bedrooms`;
}
