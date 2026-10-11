import Link from "next/link";
import { listCards } from "@/lib/repo/cards";
import { SPECIALTIES, SPECIALTY_LABEL } from "@/lib/schemas/card";
import { PageTitle, VerifiedBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ s?: string; v?: string }> }) {
  const { s, v } = await searchParams;
  const all = listCards();
  const cards = all.filter((c) => (!s || c.specialty === s) && (v === "unverified" ? !c.verified : v === "verified" ? c.verified : true));
  const unverified = all.filter((c) => !c.verified).length;

  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}>
      {label}
    </Link>
  );
  const q = (o: { s?: string; v?: string }) => {
    const p = new URLSearchParams();
    if (o.s) p.set("s", o.s);
    if (o.v) p.set("v", o.v);
    const str = p.toString();
    return str ? `/cards?${str}` : "/cards";
  };

  return (
    <div>
      <PageTitle
        title="Condition cards"
        subtitle={`${all.length} cards · ${unverified} awaiting your review`}
        action={<Link href="/cards/new" className="btn-ghost">+ New</Link>}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {chip(q({ v }), "All", !s)}
        {SPECIALTIES.map((sp) => chip(q({ s: sp, v }), SPECIALTY_LABEL[sp], s === sp))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {chip(q({ s }), "Any status", !v)}
        {chip(q({ s, v: "unverified" }), "Unverified", v === "unverified")}
        {chip(q({ s, v: "verified" }), "Verified", v === "verified")}
      </div>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id}>
            <Link href={`/cards/${c.id}`} className="card flex items-center gap-3 hover:border-accent">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {SPECIALTY_LABEL[c.specialty]} · guideline {c.guidelineDate}
                </div>
              </div>
              <VerifiedBadge verified={c.verified} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
