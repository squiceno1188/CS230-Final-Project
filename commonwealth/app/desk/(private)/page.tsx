import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { formatWhen, leadSummary, timelineLabel, whereLabel } from "@/lib/format";
import { listLeads, pipelineStats, type LeadFilter } from "@/lib/leads";
import { scoreBand } from "@/lib/score";
import { STATUSES, isStatus, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DeskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filter = readFilter(await searchParams);
  const [leads, stats] = await Promise.all([listLeads(filter), pipelineStats()]);
  const params = new URLSearchParams();
  if (filter.kind) params.set("kind", filter.kind);
  if (filter.status) params.set("status", filter.status);
  if (filter.area) params.set("area", filter.area);
  if (filter.band) params.set("band", filter.band);
  if (filter.sort) params.set("sort", filter.sort);
  if (filter.q) params.set("q", filter.q);

  return (
    <main className="wrap">
      <div className="section-head">
        <div>
          <p className="kicker">Pipeline</p>
          <h1>Lead desk</h1>
        </div>
        <div className="desk-actions">
          <a className="button-quiet" href="/api/desk/export">
            Download CSV
          </a>
          {stats.samples === 0 ? (
            <form method="post" action="/api/desk/samples">
              <button type="submit" className="button-secondary">
                Load sample pipeline
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="stat-row">
        <Stat label="Inquiries" value={stats.total} />
        <Stat label="New" value={stats.fresh} />
        <Stat label="High priority" value={stats.high} />
        <Stat label="Warm" value={stats.warm} />
        <Stat label="Buyers" value={stats.buyers} />
        <Stat label="Sellers" value={stats.sellers} />
      </div>

      <form className="filters" method="get" action="/desk">
        <label>
          <span>Kind</span>
          <select name="kind" defaultValue={filter.kind ?? ""}>
            <option value="">All</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={filter.status ?? ""}>
            <option value="">All</option>
            {STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Place</span>
          <select name="area" defaultValue={filter.area ?? ""}>
            <option value="">All</option>
            {AREAS.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Score</span>
          <select name="band" defaultValue={filter.band ?? ""}>
            <option value="">All</option>
            <option value="high">High priority, 70+</option>
            <option value="warm">Warm, 45–69</option>
            <option value="early">Early, under 45</option>
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select name="sort" defaultValue={filter.sort ?? "new"}>
            <option value="new">Newest</option>
            <option value="score">Highest score</option>
          </select>
        </label>
        <label className="filter-search">
          <span>Search</span>
          <input name="q" defaultValue={filter.q ?? ""} placeholder="Name, email, address" maxLength={80} />
        </label>
        <button type="submit" className="button">
          Apply
        </button>
        {params.size > 0 ? <Link href="/desk">Clear</Link> : null}
      </form>

      {stats.total === 0 ? (
        <section className="empty">
          <h2>No inquiries yet.</h2>
          <p>Share the buyer page, the seller page, or a neighborhood page. People who fill them out show up here. You can also load six labeled sample leads to see the pipeline before anyone real arrives.</p>
          <p className="share-links">
            <Link href="/buy">/buy</Link>
            <Link href="/sell">/sell</Link>
            <Link href="/neighborhoods/jamaica-plain">/neighborhoods/jamaica-plain</Link>
            <Link href="/neighborhoods/quincy">/neighborhoods/quincy</Link>
          </p>
        </section>
      ) : leads.length === 0 ? (
        <p className="empty">No leads match these filters.</p>
      ) : (
        <div className="lead-list">
          <div className="lead-row lead-head">
            <span>Score</span>
            <span>Person</span>
            <span>Search or property</span>
            <span>Timing</span>
            <span>Status</span>
          </div>
          {leads.map((lead) => (
            <Link key={lead.id} href={`/desk/${lead.id}`} className="lead-row">
              <span className={`score score-${scoreBand(lead.score).split(" ")[0]?.toLowerCase()}`}>
                <strong>{lead.score}</strong>
                <small>{scoreBand(lead.score)}</small>
              </span>
              <span>
                <strong>
                  {lead.firstName} {lead.lastName}
                </strong>
                <small>
                  {lead.kind === "buyer" ? "Buyer" : "Seller"}
                  {lead.sample ? " · Sample" : ""}
                  {lead.duplicateOf ? " · Possible duplicate" : ""}
                </small>
              </span>
              <span className="where">
                {whereLabel(lead)}
                <small>{leadSummary(lead)}</small>
              </span>
              <span className="when">
                {timelineLabel(lead.timeline)}
                <small>{formatWhen(lead.createdAt)}</small>
              </span>
              <span className={`pill pill-${lead.status}`}>{STATUSES.find((status) => status.id === lead.status)?.label}</span>
            </Link>
          ))}
        </div>
      )}
      {leads.length === 200 ? <p className="hint">Showing the latest 200 matches.</p> : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function readFilter(sp: Record<string, string | string[] | undefined>): LeadFilter {
  const one = (key: string) => {
    const value = sp[key];
    const raw = Array.isArray(value) ? value[0] ?? "" : value ?? "";
    return raw.trim();
  };
  const kind = one("kind");
  const status = one("status");
  const area = one("area");
  const band = one("band");
  const sort = one("sort");
  const filter: LeadFilter = {};
  if (kind === "buyer" || kind === "seller") filter.kind = kind;
  if (isStatus(status)) filter.status = status as Status;
  if (AREAS.some((item) => item.slug === area)) filter.area = area;
  if (band === "high" || band === "warm" || band === "early") filter.band = band;
  if (sort === "score") filter.sort = "score";
  const q = one("q").slice(0, 80);
  if (q) filter.q = q;
  return filter;
}
