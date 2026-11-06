import { getArea } from "./areas";
import { BATHS, BEDS, BUDGETS, CONTACTS, FINANCING, MOTIVATIONS, OCCUPANCY, PROPERTY_TYPES, SELLER_PRICES, TIMELINES } from "./options";
import type { Draft, ParsedInquiry } from "./types";

const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const SOURCES = new Set(["buy", "sell", "neighborhood", "home"]);

export type ParseResult =
  | { ok: true; spam: true }
  | { ok: true; spam: false; value: ParsedInquiry; source: string; sourceDetail: string }
  | { ok: false; error: string };

export function emptyDraft(): Draft {
  return {
    areas: [],
    propertyTypes: [],
    beds: "",
    budget: "",
    timeline: "",
    financing: "",
    mustHaves: "",
    address: "",
    area: "",
    propertyType: "",
    bedsSeller: "",
    baths: "",
    occupancy: "",
    motivation: "",
    price: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredContact: "either",
    notes: "",
    consent: false,
    companyWebsite: "",
  };
}

export function issuesForStep(kind: "buyer" | "seller", step: number, draft: Draft): string[] {
  if (kind === "buyer") {
    if (step === 0) return one(areaIssue(draft.areas));
    if (step === 1) {
      return [choiceIssue(draft.propertyTypes, "Choose at least one home type."), draft.beds ? known(draft.beds, BEDS, "Choose the number of bedrooms.") : "Choose the number of bedrooms."].filter(
        (issue): issue is string => issue != null,
      );
    }
    if (step === 2) return one(known(draft.budget, BUDGETS, "Choose a budget."));
    if (step === 3) {
      return [known(draft.timeline, TIMELINES, "Choose a timeline."), known(draft.financing, FINANCING, "Choose a financing status.")].filter(
        (issue): issue is string => issue != null,
      );
    }
    return contactIssues(draft);
  }
  if (step === 0) {
    return [known(draft.area, null, "Choose the town or neighborhood."), addressIssue(draft.address)].filter(
      (issue): issue is string => issue != null,
    );
  }
  if (step === 1) {
    return [
      known(draft.propertyType, PROPERTY_TYPES, "Choose a property type."),
      known(draft.bedsSeller, BEDS, "Choose the number of bedrooms."),
      draft.baths ? known(draft.baths, BATHS, "Choose a bathroom count.") : null,
    ].filter((issue): issue is string => issue != null);
  }
  if (step === 2) {
    return [
      known(draft.timeline, TIMELINES, "Choose a timeline."),
      known(draft.motivation, MOTIVATIONS, "Choose what is prompting the sale."),
      known(draft.occupancy, OCCUPANCY, "Choose who lives there now."),
    ].filter((issue): issue is string => issue != null);
  }
  if (step === 3) return draft.price ? one(known(draft.price, SELLER_PRICES, "Choose a price range or skip it.")) : [];
  return contactIssues(draft);
}

export function parseInquiry(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "That inquiry could not be read." };
  const raw = body as Record<string, unknown>;
  if (typeof raw.companyWebsite === "string" && raw.companyWebsite.trim() !== "") return { ok: true, spam: true };

  const kind = raw.kind === "seller" ? "seller" : raw.kind === "buyer" ? "buyer" : null;
  if (!kind) return { ok: false, error: "Choose buyer or seller." };

  const draft = draftFrom(raw);
  const issues = kind === "buyer" ? buyerIssues(draft) : sellerIssues(draft);
  const contact = contactIssues(draft);
  const error = [...issues, ...contact][0];
  if (error) return { ok: false, error };

  const budget = BUDGETS.find((item) => item.id === draft.budget);
  const price = SELLER_PRICES.find((item) => item.id === draft.price);
  const area = getArea(draft.area);
  const source = typeof raw.source === "string" && SOURCES.has(raw.source) ? raw.source : "web";
  const campaign = cleanCampaign(raw.campaign);
  const sourceDetail = source === "neighborhood" ? (kind === "seller" ? draft.area : draft.areas[0] ?? "") : campaign;

  const value: ParsedInquiry = {
    kind,
    firstName: clean(draft.firstName, 60),
    lastName: clean(draft.lastName, 60),
    email: clean(draft.email, 120).toLowerCase(),
    phone: clean(draft.phone, 30),
    preferredContact: (CONTACTS.some((item) => item.id === draft.preferredContact) ? draft.preferredContact : "either") as ParsedInquiry["preferredContact"],
    timeline: draft.timeline,
    notes: clean(draft.notes, 2000),
    areas: kind === "buyer" ? draft.areas : [draft.area],
    budgetMin: kind === "buyer" ? budget?.min ?? null : null,
    budgetMax: kind === "buyer" ? budget?.max ?? null : null,
    beds: numberOrNull(kind === "buyer" ? draft.beds : draft.bedsSeller),
    propertyTypes: kind === "buyer" ? draft.propertyTypes : draft.propertyType ? [draft.propertyType] : [],
    financing: kind === "buyer" ? draft.financing : null,
    mustHaves: kind === "buyer" ? clean(draft.mustHaves, 500) : "",
    address: kind === "seller" ? clean(draft.address, 160) : "",
    city: kind === "seller" ? area?.name ?? "" : "",
    propertyType: kind === "seller" ? draft.propertyType : "",
    baths: kind === "seller" ? draft.baths : "",
    occupancy: kind === "seller" ? draft.occupancy : "",
    motivation: kind === "seller" ? draft.motivation : "",
    priceExpectation: kind === "seller" ? price?.value ?? null : null,
  };
  return { ok: true, spam: false, value, source, sourceDetail };
}

function buyerIssues(draft: Draft) {
  return [
    areaIssue(draft.areas),
    choiceIssue(draft.propertyTypes, "Choose at least one home type."),
    known(draft.budget, BUDGETS, "Choose a budget."),
    known(draft.timeline, TIMELINES, "Choose a timeline."),
    known(draft.financing, FINANCING, "Choose a financing status."),
    draft.beds ? known(draft.beds, BEDS, "Choose the number of bedrooms.") : "Choose the number of bedrooms.",
  ].filter((issue): issue is string => issue != null);
}

function sellerIssues(draft: Draft) {
  return [
    known(draft.area, null, "Choose the town or neighborhood."),
    addressIssue(draft.address),
    known(draft.propertyType, PROPERTY_TYPES, "Choose a property type."),
    known(draft.bedsSeller, BEDS, "Choose the number of bedrooms."),
    draft.baths ? known(draft.baths, BATHS, "Choose a bathroom count.") : null,
    known(draft.timeline, TIMELINES, "Choose a timeline."),
    known(draft.motivation, MOTIVATIONS, "Choose what is prompting the sale."),
    known(draft.occupancy, OCCUPANCY, "Choose who lives there now."),
    draft.price ? known(draft.price, SELLER_PRICES, "Choose a price range or skip it.") : null,
  ].filter((issue): issue is string => issue != null);
}

function contactIssues(draft: Draft): string[] {
  const issues: string[] = [];
  if (!validName(draft.firstName)) issues.push("Enter a first name.");
  if (!validName(draft.lastName)) issues.push("Enter a last name.");
  if (!validEmail(draft.email)) issues.push("Enter a valid email.");
  if (!validPhone(draft.phone)) issues.push("Enter a phone number with at least 10 digits.");
  if (!CONTACTS.some((item) => item.id === draft.preferredContact)) issues.push("Choose how you want to be contacted.");
  if (!draft.consent) issues.push("Consent to be contacted is required.");
  const needsTown = draft.areas.includes("other") || draft.area === "other";
  if (needsTown && clean(draft.notes, 2000).length < 3) issues.push("Name the town in the note.");
  return issues;
}

function areaIssue(slugs: string[]) {
  if (slugs.length < 1) return "Choose at least one place in Greater Boston.";
  if (slugs.length > 8) return "Choose at most eight places.";
  if (slugs.some((slug) => !getArea(slug))) return "Choose places from the list.";
  return null;
}

function addressIssue(address: string) {
  const value = clean(address, 160);
  if (value.length < 5 || /[<>]/.test(value)) return "Enter the street address.";
  return null;
}

function choiceIssue(values: string[], message: string) {
  if (values.length < 1) return message;
  if (values.some((value) => !PROPERTY_TYPES.some((item) => item.id === value))) return message;
  return null;
}

function known(id: string, list: readonly { id: string }[] | null, message: string) {
  if (!id) return message;
  if (list && !list.some((item) => item.id === id)) return message;
  if (!list && !getArea(id)) return message;
  return null;
}

function one(issue: string | null) {
  return issue ? [issue] : [];
}

function draftFrom(raw: Record<string, unknown>): Draft {
  const base = emptyDraft();
  return {
    ...base,
    areas: stringList(raw.areas, 8),
    propertyTypes: stringList(raw.propertyTypes, 4),
    beds: text(raw.beds, 4),
    budget: text(raw.budget, 40),
    timeline: text(raw.timeline, 20),
    financing: text(raw.financing, 20),
    mustHaves: text(raw.mustHaves, 500),
    address: text(raw.address, 160),
    area: text(raw.area, 80),
    propertyType: text(raw.propertyType, 40),
    bedsSeller: text(raw.bedsSeller, 4),
    baths: text(raw.baths, 8),
    occupancy: text(raw.occupancy, 20),
    motivation: text(raw.motivation, 40),
    price: text(raw.price, 40),
    firstName: text(raw.firstName, 60),
    lastName: text(raw.lastName, 60),
    email: text(raw.email, 120),
    phone: text(raw.phone, 30),
    preferredContact: text(raw.preferredContact, 20) || "either",
    notes: text(raw.notes, 2000),
    consent: raw.consent === true,
    companyWebsite: "",
  };
}

function stringList(value: unknown, max: number) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, max);
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? clean(value, max) : "";
}

function clean(value: string, max: number) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function cleanCampaign(value: unknown) {
  if (typeof value !== "string") return "";
  const campaign = value.trim();
  return /^[a-z0-9][a-z0-9_-]{0,40}$/i.test(campaign) ? campaign : "";
}

function numberOrNull(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validName(value: string) {
  return /^[\p{L}][\p{L}'’. \-]{0,59}$/u.test(value.trim());
}

function validEmail(value: string) {
  const email = value.trim();
  return email.length <= 120 && !email.includes("..") && EMAIL.test(email);
}

function validPhone(value: string) {
  if (!/^[0-9+().\-\s]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
