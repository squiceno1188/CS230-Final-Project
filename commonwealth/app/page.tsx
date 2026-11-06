import Link from "next/link";
import { AREAS } from "@/lib/areas";

export default function HomePage() {
  const featured = AREAS.filter((area) => area.featured);
  return (
    <main className="wrap">
      <section className="hero">
        <p className="kicker">Greater Boston · buyers and sellers</p>
        <h1>Inquiries from people who want to buy or sell here, scored and ready to call.</h1>
        <p className="lede">
          Share a page. A buyer names the neighborhoods, the budget, and whether financing is ready. A seller names the property and the timing. Both land in one desk, with the urgent ones at the top.
        </p>
        <div className="doors">
          <Link href="/buy" className="door">
            <span>01</span>
            <h2>I&apos;m buying</h2>
            <p>Places, budget, bedrooms, and how soon you can move.</p>
          </Link>
          <Link href="/sell" className="door door-sell">
            <span>02</span>
            <h2>I&apos;m selling</h2>
            <p>The address, who lives there, and whether you want a pricing conversation.</p>
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>How a lead gets to you</h2>
        </div>
        <ol className="steps">
          <li>
            <strong>A page they can finish.</strong>
            <span>Buyer, seller, or a single neighborhood. Each one asks only what changes the next call.</span>
          </li>
          <li>
            <strong>A score, not a guess.</strong>
            <span>Timing, financing or motivation, and whether the budget meets a planning band. You still make the call.</span>
          </li>
          <li>
            <strong>A desk with a status.</strong>
            <span>New, contacted, qualified, appointment, offer, closed, nurture, or lost. An opener is written for the first touch.</span>
          </li>
        </ol>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Start from a place</h2>
          <Link href="/neighborhoods">All neighborhoods</Link>
        </div>
        <div className="area-grid">
          {featured.map((area) => (
            <Link key={area.slug} href={`/neighborhoods/${area.slug}`} className="area-card">
              <p className="group-label">{area.group}</p>
              <h3>{area.name}</h3>
              <p>{area.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
