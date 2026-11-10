export const STATUSES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "appointment", label: "Appointment" },
  { id: "offer", label: "Offer" },
  { id: "closed", label: "Closed" },
  { id: "nurture", label: "Nurture" },
  { id: "lost", label: "Lost" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];

export type Reason = { points: number; label: string };

export type ParsedInquiry = {
  kind: "buyer" | "seller";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: "phone" | "email" | "either";
  timeline: string;
  notes: string;
  areas: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  beds: number | null;
  propertyTypes: string[];
  financing: string | null;
  mustHaves: string;
  address: string;
  city: string;
  propertyType: string;
  baths: string;
  occupancy: string;
  motivation: string;
  priceExpectation: number | null;
};

export type Lead = {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  kind: "buyer" | "seller";
  status: Status;
  score: number;
  scoreReasons: Reason[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: string;
  timeline: string;
  areas: string[];
  notesFromLead: string;
  budgetMin: number | null;
  budgetMax: number | null;
  beds: number | null;
  propertyTypes: string[];
  financing: string | null;
  mustHaves: string;
  address: string;
  city: string;
  propertyType: string;
  baths: string;
  occupancy: string;
  motivation: string;
  priceExpectation: number | null;
  source: string;
  sourceDetail: string;
  sample: boolean;
  duplicateOf: string | null;
};

export type LeadNote = {
  id: string;
  body: string;
  authorLabel: string;
  createdAt: string | Date;
};

export type LeadEvent = {
  id: string;
  kind: string;
  detail: string;
  createdAt: string | Date;
};

export type Draft = {
  areas: string[];
  propertyTypes: string[];
  beds: string;
  budget: string;
  timeline: string;
  financing: string;
  mustHaves: string;
  address: string;
  area: string;
  propertyType: string;
  bedsSeller: string;
  baths: string;
  occupancy: string;
  motivation: string;
  price: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: string;
  notes: string;
  consent: boolean;
  companyWebsite: string;
};

export function isStatus(value: string): value is Status {
  return STATUSES.some((status) => status.id === value);
}
