import { CARD_LIST_FIELDS, type ConditionCard } from "@/lib/schemas/card";

export function CardView({ card }: { card: ConditionCard }) {
  return (
    <div className="space-y-3">
      {CARD_LIST_FIELDS.map((f) =>
        card.body[f.key].length ? (
          <section key={f.key} className={`card ${f.key === "redFlags" ? "border-danger/40" : ""}`}>
            <h2 className={`mb-2 text-sm font-bold ${f.key === "redFlags" ? "text-danger" : ""}`}>{f.label}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {card.body[f.key].map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </section>
        ) : null,
      )}
      {card.body.thresholds.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-bold">Key thresholds &amp; doses</h2>
          <dl className="divide-y divide-line text-sm">
            {card.body.thresholds.map((t, i) => (
              <div key={i} className="grid gap-1 py-1.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-3">
                <dt className="font-medium text-muted">{t.label}</dt>
                <dd className="font-semibold">{t.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {card.body.sources.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-bold">Sources</h2>
          <ul className="space-y-1 text-sm">
            {card.body.sources.map((s, i) => (
              <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline">{s.title}</a></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
