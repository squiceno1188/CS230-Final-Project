import Link from "next/link";

export default function NotFound() {
  return (
    <main className="narrow">
      <p className="kicker">Missing page</p>
      <h1>That page is not on this desk.</h1>
      <p>
        <Link href="/">Back to the start</Link>
      </p>
    </main>
  );
}
