"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const TABS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/consult/new", label: "Consult", icon: "✚" },
  { href: "/clinic", label: "Clinic", icon: "☰" },
  { href: "/rapid-fire", label: "Red flags", icon: "⚑" },
  { href: "/cards", label: "Cards", icon: "▤" },
];

export function NavBar() {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace("/new", "")));
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-on-accent">GP</span>
            <span>Consult</span>
          </Link>
          <nav className="ml-4 hidden gap-1 sm:flex">
            {TABS.slice(1).map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active(t.href) ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/history" className="rounded-lg px-2 py-1.5 text-sm text-muted hover:text-ink">History</Link>
            <Link href="/settings" aria-label="Settings" className="rounded-lg px-2 py-1.5 text-lg text-muted hover:text-ink">⚙</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`flex flex-col items-center py-2 text-[11px] font-medium ${active(t.href) ? "text-accent" : "text-muted"}`}>
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
