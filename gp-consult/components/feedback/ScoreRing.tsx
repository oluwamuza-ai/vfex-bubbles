export function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--ok)" : score >= 55 ? "var(--warn)" : "var(--danger)";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={`Overall score ${score} out of 100`} className="shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
      <text x="40" y="46" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--ink)">{score}</text>
    </svg>
  );
}
