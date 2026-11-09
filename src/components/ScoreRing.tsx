export function ScoreRing({ score, id }: { score: number; id: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`総合評価 ${score} / 100`} className="shrink-0">
      <defs>
        <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#17a398" />
          <stop offset="100%" stopColor="#0e3a5e" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="38" r={r} fill="none" stroke="#ede9de" strokeWidth="7" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke={`url(#ring-${id})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="38" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 21, fill: '#0a2540' }}>
        {score}
      </text>
      <text x="38" y="56" textAnchor="middle" style={{ fontSize: 8.5, fill: '#a8a294' }}>
        / 100
      </text>
    </svg>
  );
}
