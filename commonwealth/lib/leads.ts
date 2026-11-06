import { sql } from "./db";
import { SAMPLES } from "./samples";
import { scoreInquiry } from "./score";
import { STATUSES, isStatus, type Lead, type LeadEvent, type LeadNote, type ParsedInquiry, type Reason, type Status } from "./types";

export type LeadFilter = {
  kind?: "buyer" | "seller";
  status?: Status;
  area?: string;
  band?: "high" | "warm" | "early";
  sort?: "new" | "score";
  q?: string;
};

export type Stats = {
  total: number;
  buyers: number;
  sellers: number;
  fresh: number;
  high: number;
  warm: number;
  early: number;
  samples: number;
};

type Row = Record<string, unknown>;

export async function createLead(
  input: ParsedInquiry,
  meta: { source: string; sourceDetail: string; sample?: boolean; status?: Status; createdAt?: string; note?: string },
) {
  const scored = scoreInquiry(input);
  const duplicate = meta.sample ? null : await findDuplicate(input.email, input.kind);
  const id = crypto.randomUUID();
  const status = meta.status ?? "new";
  await sql(
    `insert into leads (
      id, kind, status, score, score_reasons, first_name, last_name, email, phone,
      preferred_contact, consent, timeline, areas, notes_from_lead, budget_min, budget_max,
      beds, property_types, financing, must_haves, address, city, property_type, baths,
      occupancy, motivation, price_expectation, source, source_detail, sample, duplicate_of
    ) values (
      $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9,
      $10, true, $11, $12::jsonb, $13, $14, $15,
      $16, $17::jsonb, $18, $19, $20, $21, $22, $23,
      $24, $25, $26, $27, $28, $29, $30
    )`,
    [
      id,
      input.kind,
      status,
      scored.score,
      JSON.stringify(scored.reasons),
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.preferredContact,
      input.timeline,
      JSON.stringify(input.areas),
      input.notes,
      input.budgetMin,
      input.budgetMax,
      input.beds,
      JSON.stringify(input.propertyTypes),
      input.financing,
      input.mustHaves,
      input.address,
      input.city,
      input.propertyType,
      input.baths,
      input.occupancy,
      input.motivation,
      input.priceExpectation,
      meta.source,
      meta.sourceDetail,
      Boolean(meta.sample),
      duplicate,
    ],
  );
  const label = STATUSES.find((item) => item.id === status)?.label ?? status;
  await addEvent(id, "created", meta.sample ? `Sample inquiry added as ${label}` : duplicate ? "Inquiry submitted. Possible duplicate of an earlier lead." : "Inquiry submitted");
  if (meta.createdAt) {
    await sql("update leads set created_at = $1::timestamptz where id = $2", [meta.createdAt, id]);
    await sql("update lead_events set created_at = $1::timestamptz where lead_id = $2 and kind = 'created'", [meta.createdAt, id]);
  }
  if (meta.note) await addNote(id, meta.note, "Sample");
  return { id, score: scored.score, duplicateOf: duplicate };
}

export async function listLeads(filter: LeadFilter) {
  const band = bandBounds(filter.band);
  const q = likeQuery(filter.q ?? "");
  const rows = await sql<Row>(
    `select * from leads
     where ($1::text is null or kind = $1)
       and ($2::text is null or status = $2)
       and ($3::text is null or areas @> $3::jsonb)
       and ($4::int is null or score >= $4)
       and ($5::int is null or score < $5)
       and (
         $6::text is null
         or first_name ilike $6
         or last_name ilike $6
         or email ilike $6
         or address ilike $6
         or city ilike $6
       )
     order by case when $7 = 'score' then score else 0 end desc, created_at desc
     limit 200`,
    [filter.kind ?? null, filter.status ?? null, filter.area ? JSON.stringify([filter.area]) : null, band.min, band.max, q, filter.sort === "score" ? "score" : "new"],
  );
  return rows.map(mapLead);
}

export async function getLeadBundle(id: string) {
  if (!isId(id)) return null;
  const rows = await sql<Row>("select * from leads where id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  const notes = await sql<Row>("select * from lead_notes where lead_id = $1 order by created_at asc", [id]);
  const events = await sql<Row>("select * from lead_events where lead_id = $1 order by created_at asc", [id]);
  return { lead: mapLead(row), notes: notes.map(mapNote), events: events.map(mapEvent) };
}

export async function setStatus(id: string, status: Status) {
  if (!isId(id) || !isStatus(status)) return false;
  const rows = await sql<Row>("update leads set status = $1, updated_at = now() where id = $2 and status <> $1 returning id", [status, id]);
  if (!rows[0]) {
    const existing = await sql<Row>("select id from leads where id = $1", [id]);
    return Boolean(existing[0]);
  }
  const label = STATUSES.find((item) => item.id === status)?.label ?? status;
  await addEvent(id, "status", `Status set to ${label}`);
  return true;
}

export async function addNote(id: string, body: string, author: string) {
  if (!isId(id)) return false;
  const existing = await sql<Row>("select id from leads where id = $1", [id]);
  if (!existing[0]) return false;
  await sql("insert into lead_notes (id, lead_id, body, author_label) values ($1, $2, $3, $4)", [crypto.randomUUID(), id, body, author]);
  await sql("update leads set updated_at = now() where id = $1", [id]);
  await addEvent(id, "note", "Note added");
  return true;
}

export async function pipelineStats(): Promise<Stats> {
  const rows = await sql<Row>(
    `select
      count(*)::int as total,
      count(*) filter (where kind = 'buyer')::int as buyers,
      count(*) filter (where kind = 'seller')::int as sellers,
      count(*) filter (where status = 'new')::int as fresh,
      count(*) filter (where score >= 70)::int as high,
      count(*) filter (where score >= 45 and score < 70)::int as warm,
      count(*) filter (where score < 45)::int as early,
      count(*) filter (where sample)::int as samples
    from leads`,
  );
  const row = rows[0] ?? {};
  return {
    total: asInt(row.total) ?? 0,
    buyers: asInt(row.buyers) ?? 0,
    sellers: asInt(row.sellers) ?? 0,
    fresh: asInt(row.fresh) ?? 0,
    high: asInt(row.high) ?? 0,
    warm: asInt(row.warm) ?? 0,
    early: asInt(row.early) ?? 0,
    samples: asInt(row.samples) ?? 0,
  };
}

export async function loadSamples() {
  const existing = await sql<Row>("select email from leads where sample = true");
  const have = new Set(existing.map((row) => String(row.email)));
  let inserted = 0;
  for (const sample of SAMPLES) {
    if (have.has(sample.inquiry.email)) continue;
    const createdAt = new Date(Date.now() - sample.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    await createLead(sample.inquiry, {
      source: sample.source,
      sourceDetail: sample.sourceDetail,
      sample: true,
      status: sample.status,
      createdAt,
      note: sample.note,
    });
    inserted += 1;
  }
  return inserted;
}

export async function leadsForExport() {
  const leads = await sql<Row>("select * from leads order by created_at desc limit 5000");
  const notes = await sql<Row>("select lead_id, body from lead_notes order by created_at asc");
  const byLead = new Map<string, string[]>();
  for (const note of notes) {
    const id = String(note.lead_id);
    const list = byLead.get(id) ?? [];
    list.push(String(note.body));
    byLead.set(id, list);
  }
  return leads.map((row) => ({ lead: mapLead(row), notes: byLead.get(String(row.id)) ?? [] }));
}

async function findDuplicate(email: string, kind: string) {
  const rows = await sql<Row>(
    `select id from leads
     where email = $1 and kind = $2 and sample = false and created_at > now() - interval '14 days'
     order by created_at desc
     limit 1`,
    [email, kind],
  );
  return rows[0] ? String(rows[0].id) : null;
}

async function addEvent(id: string, kind: string, detail: string) {
  await sql("insert into lead_events (id, lead_id, kind, detail) values ($1, $2, $3, $4)", [crypto.randomUUID(), id, kind, detail]);
}

function bandBounds(band: LeadFilter["band"]) {
  if (band === "high") return { min: 70, max: null };
  if (band === "warm") return { min: 45, max: 70 };
  if (band === "early") return { min: null, max: 45 };
  return { min: null, max: null };
}

function likeQuery(value: string) {
  const cleaned = value.trim().slice(0, 80).replace(/[%_\\]/g, "");
  return cleaned ? `%${cleaned}%` : null;
}

export function isLeadId(id: string) {
  return isId(id);
}

function isId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function mapLead(row: Row): Lead {
  const kind = row.kind === "seller" ? "seller" : "buyer";
  const statusText = String(row.status ?? "");
  const status = isStatus(statusText) ? statusText : "new";
  return {
    id: String(row.id),
    createdAt: row.created_at as string | Date,
    updatedAt: row.updated_at as string | Date,
    kind,
    status,
    score: asInt(row.score) ?? 0,
    scoreReasons: asReasons(row.score_reasons),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    preferredContact: String(row.preferred_contact ?? "either"),
    timeline: String(row.timeline ?? ""),
    areas: asStringArray(row.areas),
    notesFromLead: String(row.notes_from_lead ?? ""),
    budgetMin: asInt(row.budget_min),
    budgetMax: asInt(row.budget_max),
    beds: asInt(row.beds),
    propertyTypes: asStringArray(row.property_types),
    financing: row.financing == null || row.financing === "" ? null : String(row.financing),
    mustHaves: String(row.must_haves ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    propertyType: String(row.property_type ?? ""),
    baths: String(row.baths ?? ""),
    occupancy: String(row.occupancy ?? ""),
    motivation: String(row.motivation ?? ""),
    priceExpectation: asInt(row.price_expectation),
    source: String(row.source ?? ""),
    sourceDetail: String(row.source_detail ?? ""),
    sample: row.sample === true || row.sample === "t" || row.sample === "true",
    duplicateOf: row.duplicate_of == null || row.duplicate_of === "" ? null : String(row.duplicate_of),
  };
}

function mapNote(row: Row): LeadNote {
  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    authorLabel: String(row.author_label ?? "Desk"),
    createdAt: row.created_at as string | Date,
  };
}

function mapEvent(row: Row): LeadEvent {
  return {
    id: String(row.id),
    kind: String(row.kind ?? ""),
    detail: String(row.detail ?? ""),
    createdAt: row.created_at as string | Date,
  };
}

function asInt(value: unknown) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function asStringArray(value: unknown) {
  const parsed = asJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => String(item));
}

function asReasons(value: unknown): Reason[] {
  const parsed = asJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { points?: unknown; label?: unknown };
    const points = Number(record.points);
    if (typeof record.label !== "string" || !Number.isFinite(points)) return [];
    return [{ points, label: record.label }];
  });
}

function asJson(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return value;
}
