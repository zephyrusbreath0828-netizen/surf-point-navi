// スコアリングの動作確認(node --experimental-strip-types scripts/score-check.ts)
import { evaluatePoint, bestHourIdx, forecastAt } from '../src/lib/score.ts';
import { DEFAULT_POINTS } from '../src/lib/defaultPoints.ts';
import type { Forecast, PointData, SurfPoint } from '../src/lib/types.ts';

const base = {
  time: '2026-11-09T08:00',
  windDir: 0,
  windSpeed: 0,
  waveHeight: null,
  waveDir: null,
  wavePeriod: null,
  temp: 20,
} as Forecast;

function show(title: string, p: SurfPoint, f: Forecast) {
  const e = evaluatePoint(p, f);
  console.log(`[${title}] ${p.name} score=${e?.score} stars=${e?.stars} label=${e?.label}`);
  e?.reasons.forEach((r) => console.log('  -', r));
}

const ikumi = DEFAULT_POINTS[0];

show('パーフェクト(オフショア+直接入りのうねり)', ikumi, {
  ...base,
  windDir: (ikumi.bearing + 180) % 360,
  windSpeed: 5,
  waveHeight: 1.1,
  waveDir: ikumi.bearing,
  wavePeriod: 11,
});
show('強オンショア+小さめ', ikumi, {
  ...base,
  windDir: ikumi.bearing,
  windSpeed: 10,
  waveHeight: 0.3,
  waveDir: (ikumi.bearing + 180) % 360,
  wavePeriod: 5,
});
show('無風+フラット', ikumi, { ...base, windSpeed: 1, waveHeight: 0.15, waveDir: ikumi.bearing, wavePeriod: 7 });
show('サイド風+なじみサイズ', ikumi, {
  ...base,
  windDir: (ikumi.bearing + 180 + 70) % 360,
  windSpeed: 6,
  waveHeight: 1.2,
  waveDir: (ikumi.bearing + 40) % 360,
  wavePeriod: 9,
});
show('大きすぎ(初心者ポイント)', DEFAULT_POINTS[3], {
  ...base,
  windDir: (DEFAULT_POINTS[3].bearing + 180) % 360,
  windSpeed: 4,
  waveHeight: 2.4,
  waveDir: DEFAULT_POINTS[3].bearing,
  wavePeriod: 12,
});
show('うねりデータなし', ikumi, { ...base, windDir: (ikumi.bearing + 180) % 360, windSpeed: 5, waveHeight: null, waveDir: null, wavePeriod: null });

// ベストタイムの健全性: 朝オンショア→昼にオフショアへ変わる日にち
const pd: PointData = {
  curIdx: 8,
  fetchedAt: 0,
  series: {
    time: Array.from({ length: 48 }, (_, h) => `2026-11-09T${String(h).padStart(2, '0')}:00`),
    windDir: Array(48).fill(ikumi.bearing), // 朝: オンショア
    windSpeed: Array(48).fill(6),
    temp: Array(48).fill(20),
    waveHeight: Array(48).fill(1.0),
    waveDir: Array(48).fill(ikumi.bearing),
    wavePeriod: Array(48).fill(8),
  },
};
for (let h = 12; h <= 15; h++) pd.series.windDir[h] = (ikumi.bearing + 180) % 360; // 昼だけオフショア
const bi = bestHourIdx(pd, ikumi);
console.log('bestHour =', bi != null ? pd.series.time[bi] : null, '(12〜15時のいずれかであるべき)');
console.log('08時の評価 =', evaluatePoint(ikumi, forecastAt(pd, 8))?.score, '(低いはず)');
console.log('13時の評価 =', evaluatePoint(ikumi, forecastAt(pd, 13))?.score, '(高いはず)');
