import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = { title: "Buying in Greater Boston" };

export default async function BuyPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <main className="wrap form-page">
      <div className="form-intro">
        <p className="kicker">Buyer inquiry</p>
        <h1>Tell us where you want to live.</h1>
        <p>Five short steps. A person follows up by phone or email. This does not commit you to buy, and it does not check your credit.</p>
      </div>
      <InquiryForm kind="buyer" source="buy" campaign={from ?? ""} />
    </main>
  );
}
