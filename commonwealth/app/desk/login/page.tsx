import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deskAllowed, deskConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Open the desk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await deskAllowed()) redirect("/desk");
  const { error } = await searchParams;
  const configured = deskConfigured();
  return (
    <main className="narrow">
      <p className="kicker">Lead desk</p>
      <h1>Open the pipeline.</h1>
      {configured ? (
        <form method="post" action="/api/desk/login" className="stack">
          {error === "rate" ? <p className="form-error">Too many attempts. Wait a few minutes and try again.</p> : null}
          {error === "1" ? <p className="form-error">That code did not match.</p> : null}
          <label className="field" htmlFor="code">
            <span>Access code</span>
            <input id="code" name="code" type="password" autoComplete="current-password" required maxLength={200} />
          </label>
          <button type="submit" className="button">
            Open the desk
          </button>
        </form>
      ) : (
        <p>The public pages are available. This desk stays locked until an access code is set for the app as DESK_ACCESS_CODE.</p>
      )}
    </main>
  );
}
