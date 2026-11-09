// 実API→地方JSON→スコア→ランキングの一連の動作確認(node --experimental-strip-types)
import { fetchPointData } from '../src/lib/openmeteo.ts';
import { evaluatePoint, currentForecast, bestHourIdx } from '../src/lib/score.ts';
import { loadPointsForCheck } from './load-points.ts';

const POINTS = loadPointsForCheck();
const data = await fetchPointData(POINTS);
const ranked = POINTS.map((p) => {
  const pd = data[p.id];
  const f = pd ? currentForecast(pd) : null;
  const ev = f ? evaluatePoint(p, f) : null;
  const best = pd ? bestHourIdx(pd, p) : null;
  return { name: p.name, f, ev, bestTime: best != null ? pd.series.time[best] : null };
}).sort((a, b) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1));

for (const r of ranked) {
  if (!r.ev) { console.log(`${r.name}: データなし`); continue; }
  console.log(
    `${r.name}: ${r.ev.score}点 ${'★'.repeat(r.ev.stars)} ${r.ev.label} | ` +
    `${r.ev.windDirName}風 ${r.f!.windSpeed.toFixed(1)}m/s | 波 ${r.f!.waveHeight ?? '—'}m | ` +
    `ベスト ${r.bestTime ? r.bestTime.slice(11, 16) : '—'}`
  );
  r.ev.reasons.forEach((x) => console.log('   -', x));
}
