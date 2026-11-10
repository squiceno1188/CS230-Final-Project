import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Inquiry received", robots: { index: false, follow: false } };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const selling = kind === "seller";
  return (
    <main className="narrow">
      <p className="kicker">Inquiry received</p>
      <h1>{selling ? "Thank you. A pricing conversation is the next step." : "Thank you. A short list is the next step."}</h1>
      <p>Someone will use the phone number or email you gave. That follow-up is a conversation. It is not an agreement to buy or sell, and it is not an appraisal.</p>
      <p className="actions-inline">
        <Link href="/neighborhoods">Browse neighborhoods</Link>
        <Link href="/">{selling ? "Back home" : "Back home"}</Link>
      </p>
    </main>
  );
}
