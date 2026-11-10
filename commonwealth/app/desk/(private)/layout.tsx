import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deskAllowed, deskConfigured, deskUnlockedLocally } from "@/lib/auth";

export const metadata: Metadata = { title: "Lead desk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  if (!(await deskAllowed())) redirect("/desk/login");
  return (
    <>
      {deskUnlockedLocally() ? (
        <p className="banner">This desk is open on this computer because no access code is set. Set DESK_ACCESS_CODE before you share the app, so inquiries stay with you.</p>
      ) : null}
      {deskConfigured() ? (
        <form method="post" action="/api/desk/logout" className="lock-form">
          <button type="submit" className="button-quiet">
            Lock desk
          </button>
        </form>
      ) : null}
      {children}
    </>
  );
}
