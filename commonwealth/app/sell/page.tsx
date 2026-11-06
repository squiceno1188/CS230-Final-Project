import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = { title: "Selling in Greater Boston" };

export default async function SellPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <main className="wrap form-page">
      <div className="form-intro">
        <p className="kicker">Seller inquiry</p>
        <h1>Ask for a pricing conversation.</h1>
        <p>Share the property and the timing. What you get back is a conversation about price and process, not an appraisal and not a promise of a sale price.</p>
      </div>
      <InquiryForm kind="seller" source="sell" campaign={from ?? ""} />
    </main>
  );
}
