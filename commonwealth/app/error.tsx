"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="narrow">
      <p className="kicker">Something stalled</p>
      <h1>This page hit a snag.</h1>
      <p>Nothing was changed that we can confirm. Try the page again.</p>
      <button type="button" className="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
