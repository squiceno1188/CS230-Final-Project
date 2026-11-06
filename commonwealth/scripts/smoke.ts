import { addNote, createLead, getLeadBundle, listLeads, loadSamples, pipelineStats, setStatus } from "../lib/leads";

const created = await createLead(
  {
    kind: "buyer",
    firstName: "Smoke",
    lastName: "Test",
    email: "smoke.test@example.com",
    phone: "(617) 555-0101",
    preferredContact: "email",
    timeline: "1-3",
    notes: "Database smoke test. Not a real person.",
    areas: ["somerville"],
    budgetMin: 700_000,
    budgetMax: 1_000_000,
    beds: 2,
    propertyTypes: ["condo"],
    financing: "preapproved",
    mustHaves: "Near a train",
    address: "",
    city: "",
    propertyType: "",
    baths: "",
    occupancy: "",
    motivation: "",
    priceExpectation: null,
  },
  { source: "buy", sourceDetail: "smoke" },
);

const again = await createLead(
  {
    kind: "buyer",
    firstName: "Smoke",
    lastName: "Test",
    email: "smoke.test@example.com",
    phone: "(617) 555-0101",
    preferredContact: "email",
    timeline: "1-3",
    notes: "Second submit.",
    areas: ["somerville"],
    budgetMin: 700_000,
    budgetMax: 1_000_000,
    beds: 2,
    propertyTypes: ["condo"],
    financing: "preapproved",
    mustHaves: "",
    address: "",
    city: "",
    propertyType: "",
    baths: "",
    occupancy: "",
    motivation: "",
    priceExpectation: null,
  },
  { source: "buy", sourceDetail: "" },
);

if (again.duplicateOf !== created.id) throw new Error("duplicate was not linked");
if (!(await setStatus(created.id, "contacted"))) throw new Error("status update failed");
if (!(await addNote(created.id, "Called and booked a time.", "Desk"))) throw new Error("note failed");

const bundle = await getLeadBundle(created.id);
if (!bundle || bundle.lead.status !== "contacted" || bundle.notes.length !== 1) throw new Error("bundle mismatch");

const listed = await listLeads({ area: "somerville", kind: "buyer" });
if (!listed.some((lead) => lead.id === created.id)) throw new Error("area filter missed the lead");

const inserted = await loadSamples();
if (inserted < 6) throw new Error(`expected samples, inserted ${inserted}`);
const stats = await pipelineStats();
if (stats.total < 8) throw new Error(`expected a pipeline, saw ${stats.total}`);
const second = await loadSamples();
if (second !== 0) throw new Error("samples were inserted twice");

console.log("smoke ok", { score: created.score, stats });
