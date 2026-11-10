"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/neighborhoods", label: "Neighborhoods" },
  { href: "/desk", label: "Desk" },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="top">
      <Link href="/" className="mark">
        Commonwealth
        <span>Greater Boston leads</span>
      </Link>
      <nav className="nav" aria-label="Primary">
        {LINKS.map((link) => {
          const current = path === link.href || path.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
