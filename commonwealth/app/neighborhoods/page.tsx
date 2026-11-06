import type { Metadata } from "next";
import Link from "next/link";
import { AREAS, GROUPS, groupId } from "@/lib/areas";

export const metadata: Metadata = { title: "Greater Boston neighborhoods" };

export default function NeighborhoodsPage() {
  return (
    <main className="wrap">
      <p className="kicker">Where people are looking</p>
      <h1>Greater Boston, town by town.</h1>
      <p className="lede">Each page is a place to send a buyer or a seller. The planning band on the page is for qualification, not a value.</p>
      <nav className="jump" aria-label="Regions">
        {GROUPS.map((group) => (
          <a key={group} href={`#${groupId(group)}`}>
            {group}
          </a>
        ))}
      </nav>
      {GROUPS.map((group) => (
        <section key={group} className="panel" id={groupId(group)}>
          <h2>{group}</h2>
          <div className="area-grid">
            {AREAS.filter((area) => area.group === group).map((area) => (
              <Link key={area.slug} href={`/neighborhoods/${area.slug}`} className="area-card">
                <h3>{area.name}</h3>
                <p>{area.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
