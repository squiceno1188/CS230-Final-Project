import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { getArea } from "@/lib/areas";
import { budgetPhrase, financingLabel, formatWhen, motivationLabel, occupancyLabel, timelineLabel, whereLabel } from "@/lib/format";
import { bedsLabel, labelOf, PROPERTY_TYPES, SELLER_PRICES } from "@/lib/options";
import { getLeadBundle } from "@/lib/leads";
import { opener } from "@/lib/opener";
import { scoreBand } from "@/lib/score";
import { STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const bundle = await getLeadBundle(id);
  if (!bundle) notFound();
  const { lead, notes, events } = bundle;
  const text = opener(lead);
  const emailOk = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(lead.email);
  const phoneDigits = lead.phone.replace(/[^\d+]/g, "");
  const phoneOk = /^\+?\d{10,15}$/.test(phoneDigits);
  const areas = lead.areas.map((slug) => getArea(slug)).filter((area) => area != null);

  return (
    <main className="wrap">
      <p className="kicker">
        <Link href="/desk">Pipeline</Link>
      </p>
      <div className="section-head">
        <div>
          <h1>
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="lede tight">
            {lead.kind === "buyer" ? "Buyer" : "Seller"} · {whereLabel(lead)}
            {lead.sample ? " · Sample" : ""}
          </p>
        </div>
        <p className={`score score-${scoreBand(lead.score).split(" ")[0]?.toLowerCase()} score-large`}>
          <strong>{lead.score}</strong>
          <small>{scoreBand(lead.score)}</small>
        </p>
      </div>

      <section className="status-row" aria-label="Status">
        {STATUSES.map((status) => (
          <form key={status.id} method="post" action={`/api/desk/leads/${lead.id}`}>
            <input type="hidden" name="status" value={status.id} />
            <button type="submit" className={lead.status === status.id ? "button" : "button-quiet"} aria-current={lead.status === status.id ? "true" : undefined} disabled={lead.status === status.id}>
              {status.label}
            </button>
          </form>
        ))}
      </section>

      <div className="detail-grid">
        <section>
          <h2>Contact</h2>
          <dl>
            <dt>Email</dt>
            <dd>{emailOk ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : lead.email}</dd>
            <dt>Phone</dt>
            <dd>{phoneOk ? <a href={`tel:${phoneDigits}`}>{lead.phone}</a> : lead.phone}</dd>
            <dt>Prefers</dt>
            <dd>{lead.preferredContact}</dd>
            <dt>Received</dt>
            <dd>{formatWhen(lead.createdAt)}</dd>
            <dt>Source</dt>
            <dd>{sourceLabel(lead.source, lead.sourceDetail)}</dd>
            {lead.duplicateOf ? (
              <>
                <dt>Possible duplicate</dt>
                <dd>
                  <Link href={`/desk/${lead.duplicateOf}`}>Earlier inquiry</Link>
                </dd>
              </>
            ) : null}
          </dl>

          <h2>{lead.kind === "buyer" ? "Search" : "Property"}</h2>
          <dl>
            {lead.kind === "buyer" ? (
              <>
                <dt>Budget</dt>
                <dd>{budgetPhrase(lead.budgetMin, lead.budgetMax) || "—"}</dd>
                <dt>Home</dt>
                <dd>{[bedsLabel(lead.beds), lead.propertyTypes.map((id) => labelOf(PROPERTY_TYPES, id)).filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}</dd>
                <dt>Financing</dt>
                <dd>{financingLabel(lead.financing) || "—"}</dd>
                <dt>Must-haves</dt>
                <dd>{lead.mustHaves || "—"}</dd>
              </>
            ) : (
              <>
                <dt>Address</dt>
                <dd>{whereLabel(lead) || "—"}</dd>
                <dt>Home</dt>
                <dd>{[bedsLabel(lead.beds), labelOf(PROPERTY_TYPES, lead.propertyType), lead.baths ? `${lead.baths} bath` : ""].filter(Boolean).join(" · ") || "—"}</dd>
                <dt>Occupancy</dt>
                <dd>{occupancyLabel(lead.occupancy) || "—"}</dd>
                <dt>Motivation</dt>
                <dd>{motivationLabel(lead.motivation) || "—"}</dd>
                <dt>Expectation</dt>
                <dd>{SELLER_PRICES.find((item) => item.value === lead.priceExpectation)?.label ?? "Wants to discuss it"}</dd>
              </>
            )}
            <dt>Timing</dt>
            <dd>{timelineLabel(lead.timeline) || "—"}</dd>
            <dt>Their note</dt>
            <dd>{lead.notesFromLead || "—"}</dd>
          </dl>

          {areas.length > 0 ? (
            <>
              <h2>Planning bands</h2>
              <ul className="bands">
                {areas.map((area) => (
                  <li key={area.slug}>
                    <strong>{area.name}.</strong> {area.band.label}
                  </li>
                ))}
              </ul>
              <p className="hint">Bands qualify the lead. They are not an appraisal.</p>
            </>
          ) : null}
        </section>

        <section>
          <h2>First touch</h2>
          <p className="opener">{text}</p>
          <CopyButton text={text} label="Copy opener" />

          <h2>Why this score</h2>
          <ul className="reasons">
            {lead.scoreReasons.map((reason) => (
              <li key={`${reason.label}-${reason.points}`}>
                <span>{reason.points > 0 ? `+${reason.points}` : reason.points}</span>
                {reason.label}
              </li>
            ))}
          </ul>

          <h2>Notes</h2>
          {error === "note" ? <p className="form-error">Write a note before saving it.</p> : null}
          <ul className="notes">
            {notes.map((note) => (
              <li key={note.id}>
                <p>{note.body}</p>
                <small>
                  {note.authorLabel} · {formatWhen(note.createdAt)}
                </small>
              </li>
            ))}
          </ul>
          <form method="post" action={`/api/desk/leads/${lead.id}/notes`} className="stack">
            <label className="field" htmlFor="author">
              <span>Your name</span>
              <input id="author" name="author" maxLength={60} placeholder="Optional" />
            </label>
            <label className="field" htmlFor="body">
              <span>Note</span>
              <textarea id="body" name="body" rows={4} maxLength={2000} required />
            </label>
            <button type="submit" className="button">
              Add note
            </button>
          </form>

          <h2>Activity</h2>
          <ul className="activity">
            {events.map((event) => (
              <li key={event.id}>
                <span>{formatWhen(event.createdAt)}</span>
                {event.detail}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function sourceLabel(source: string, detail: string) {
  const place = getArea(detail)?.name;
  if (source === "neighborhood") return place ? `Neighborhood page · ${place}` : "Neighborhood page";
  if (source === "buy") return detail ? `Buyer page · ${detail}` : "Buyer page";
  if (source === "sell") return detail ? `Seller page · ${detail}` : "Seller page";
  return "Web";
}
