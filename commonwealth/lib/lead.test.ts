import assert from "node:assert/strict";
import { csvCell, toCsv } from "./csv";
import { scoreInquiry } from "./score";
import type { ParsedInquiry } from "./types";
import { parseInquiry } from "./validate";

const base: ParsedInquiry = {
  kind: "buyer",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "(617) 555-0100",
  preferredContact: "phone",
  timeline: "asap",
  notes: "Need a place near the garden",
  areas: ["back-bay"],
  budgetMin: 2_500_000,
  budgetMax: null,
  beds: 2,
  propertyTypes: ["condo"],
  financing: "cash",
  mustHaves: "Elevator and light",
  address: "",
  city: "",
  propertyType: "",
  baths: "",
  occupancy: "",
  motivation: "",
  priceExpectation: null,
};

const ready = scoreInquiry(base);
assert.ok(ready.score >= 70, `ready buyer should be high priority, got ${ready.score}`);
assert.equal(
  ready.reasons.reduce((sum, reason) => sum + reason.points, 0),
  ready.score,
);

const early = scoreInquiry({
  ...base,
  timeline: "browsing",
  financing: "exploring",
  preferredContact: "either",
  notes: "",
  mustHaves: "",
  budgetMin: null,
  budgetMax: 600_000,
});
assert.ok(early.score < 45, `stretch browser should be early, got ${early.score}`);

const relocating: ParsedInquiry = {
  ...base,
  kind: "seller",
  areas: ["newton"],
  timeline: "1-3",
  financing: null,
  address: "100 Sample Street",
  city: "Newton",
  propertyType: "single",
  occupancy: "vacant",
  motivation: "relocating",
  priceExpectation: 1_550_000,
  budgetMin: null,
  budgetMax: null,
};
const sellerReady = scoreInquiry(relocating);
const sellerEarly = scoreInquiry({
  ...relocating,
  timeline: "6-12",
  occupancy: "tenant",
  motivation: "curious",
  priceExpectation: null,
  notes: "",
  preferredContact: "either",
});
assert.ok(sellerReady.score > sellerEarly.score);

const missing = parseInquiry({
  kind: "buyer",
  areas: ["cambridge"],
  propertyTypes: ["condo"],
  beds: "2",
  budget: "900-1300",
  timeline: "1-3",
  financing: "preapproved",
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  phone: "6175550142",
  preferredContact: "phone",
  consent: false,
});
assert.equal(missing.ok, false);

const badArea = parseInquiry({
  kind: "buyer",
  areas: ["not-a-place"],
  propertyTypes: ["condo"],
  beds: "2",
  budget: "900-1300",
  timeline: "1-3",
  financing: "preapproved",
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  phone: "6175550142",
  preferredContact: "phone",
  consent: true,
});
assert.equal(badArea.ok, false);

const spam = parseInquiry({
  kind: "buyer",
  companyWebsite: "https://spam.example",
  consent: true,
});
assert.equal(spam.ok && spam.spam, true);

const good = parseInquiry({
  kind: "seller",
  source: "neighborhood",
  area: "jamaica-plain",
  address: "10 Sample Street",
  propertyType: "condo",
  bedsSeller: "2",
  timeline: "asap",
  motivation: "downsizing",
  occupancy: "owner",
  price: "discuss",
  firstName: "Priya",
  lastName: "Shah",
  email: "Priya@Example.com",
  phone: "(617) 555-0160",
  preferredContact: "email",
  consent: true,
  notes: "Sample",
});
assert.equal(good.ok, true);
if (good.ok && !good.spam) {
  assert.equal(good.value.email, "priya@example.com");
  assert.equal(good.value.city, "Jamaica Plain");
  assert.equal(good.sourceDetail, "jamaica-plain");
  assert.equal(good.value.priceExpectation, null);
}

assert.equal(csvCell('=cmd|"/c calc"!A1'), `"'=cmd|""/c calc""!A1"`);
assert.ok(toCsv([["name"], ["Maya"]]).startsWith("\uFEFF"));

console.log("lead tests ok", { ready: ready.score, early: early.score, sellerReady: sellerReady.score, sellerEarly: sellerEarly.score });
