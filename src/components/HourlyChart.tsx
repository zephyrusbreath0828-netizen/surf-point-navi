import type { PointData, SurfPoint } from '../types.ts';
import { bestHourIdx } from '../lib/score.ts';

/** 本日(6〜19時)の波高バー+風速折れ線。ベスト時間を強調 */
export function HourlyChart({ pd, point }: { pd: PointData; point: SurfPoint }) {
  const day = pd.series.time[pd.curIdx]?.slice(0, 10) ?? '';
  const idxs: number[] = [];
  pd.series.time.forEach((t, i) => {
    if (t.startsWith(day)) {
      const h = parseInt(t.slice(11, 13), 10);
      if (h >= 6 && h <= 19) idxs.push(i);
    }
  });
  if (idxs.length < 2) return null;

  const best = bestHourIdx(pd, point);
  const W = 336, H = 140, L = 26, R = 10, T = 14, B = 24;
  const iw = W - L - R, ih = H - T - B, n = idxs.length;
  const maxWave = Math.max(1.5, ...idxs.map((i) => pd.series.waveHeight[i] ?? 0));
  const maxWind = Math.max(6, ...idxs.map((i) => pd.series.windSpeed[i] ?? 0));
  const x = (k: number) => L + (iw * (k + 0.5)) / n;
  const yWind = (i: number) => T + ih - (ih * (pd.series.windSpeed[i] ?? 0)) / maxWind;
  const hourOf = (i: number) => parseInt(pd.series.time[i].slice(11, 13), 10);
  const ticks = idxs.filter((i) => hourOf(i) % 3 === 0);
  const hasWave = idxs.some((i) => pd.series.waveHeight[i] != null);

  return (
    <div className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-ocean-950">本日の推移(6〜19時)</h3>
        <div className="flex items-center gap-2.5 text-[10px] text-neutral-500">
          {hasWave && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-lagoon-500 inline-block" />
              波高m
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-0.5 bg-coral-500 inline-block" />
            風速m/s
          </span>
          {best != null && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-sun-500 inline-block" />
              BEST
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="本日の波高と風速の推移">
        {best != null && idxs.indexOf(best) >= 0 && (
          <line x1={x(idxs.indexOf(best))} y1={T} x2={x(idxs.indexOf(best))} y2={T + ih} stroke="#f5a524" strokeWidth="1.5" strokeDasharray="3 3" />
        )}
        {idxs.map((i, k) => {
          const h = pd.series.waveHeight[i];
          if (h == null) return null;
          const bh = Math.max(2, (ih * h) / maxWave);
          return <rect key={i} x={x(k) - 7} y={T + ih - bh} width="14" height={bh} rx="3" fill={i === best ? '#f5a524' : '#17a398'} opacity="0.9" />;
        })}
        <polyline
          points={idxs.map((i, k) => `${x(k)},${yWind(i)}`).join(' ')}
          fill="none"
          stroke="#e2603f"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {ticks.map((i) => (
          <text key={i} x={x(idxs.indexOf(i))} y={H - 6} textAnchor="middle" style={{ fontSize: 10, fill: '#a8a294' }}>
            {hourOf(i)}時
          </text>
        ))}
      </svg>
    </div>
  );
}
