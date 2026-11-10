import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/InquiryForm";
import { AREAS, getArea } from "@/lib/areas";

export function generateStaticParams() {
  return AREAS.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) return { title: "Neighborhood" };
  return { title: area.name, description: area.summary };
}

export default async function NeighborhoodPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; intent?: string }> }) {
  const { slug } = await params;
  const { from, intent } = await searchParams;
  const area = getArea(slug);
  if (!area) notFound();
  const selling = intent === "sell";
  return (
    <main className="wrap place">
      <p className="kicker">{area.group}</p>
      <h1>{area.name}</h1>
      <p className="lede">{area.summary}</p>
      <div className="facts">
        <article>
          <h2>Housing</h2>
          <p>{area.housing}</p>
        </article>
        <article>
          <h2>Getting around</h2>
          <p>{area.transit}</p>
        </article>
        <article>
          <h2>Who it fits</h2>
          <p>{area.fit}</p>
        </article>
        <article>
          <h2>Planning band</h2>
          <p>{area.band.label}</p>
          <p className="hint">A wide range for scoring inquiries. Not an appraisal and not a current market statistic.</p>
        </article>
      </div>
      <div className="intent-switch">
        <Link href={`/neighborhoods/${area.slug}`} aria-current={!selling ? "page" : undefined}>
          I want to buy here
        </Link>
        <Link href={`/neighborhoods/${area.slug}?intent=sell`} aria-current={selling ? "page" : undefined}>
          I want to sell here
        </Link>
      </div>
      <InquiryForm key={`${selling ? "seller" : "buyer"}-${area.slug}`} kind={selling ? "seller" : "buyer"} source="neighborhood" campaign={from ?? ""} presetArea={area.slug} />
    </main>
  );
}
