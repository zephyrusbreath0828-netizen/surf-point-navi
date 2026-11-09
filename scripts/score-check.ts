// スコアリングの動作確認(node --experimental-strip-types scripts/score-check.ts)
import { evaluatePoint, bestHourIdx, forecastAt } from '../src/lib/score.ts';
import { loadPointsForCheck } from './load-points.ts';
import { letterToDeg } from '../src/lib/format.ts';
import type { Forecast, PointData, SurfPoint } from '../src/lib/types.ts';

const POINTS = loadPointsForCheck();
const ikumi = POINTS.find((p) => p.id === 'ikumi')!;
const irino = POINTS.find((p) => p.id === 'irino')!;

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

show('パーフェクト(良い風+直接入りのうねり)', ikumi, {
  ...base,
  windDir: letterToDeg(ikumi.goodWind[0])!,
  windSpeed: 5,
  waveHeight: 1.1,
  waveDir: letterToDeg(ikumi.goodSwell[0])!,
  wavePeriod: 11,
});
show('最悪(嫌いな風+逆うねり+小さめ)', ikumi, {
  ...base,
  windDir: letterToDeg(ikumi.badWind[0])!,
  windSpeed: 10,
  waveHeight: 0.3,
  waveDir: letterToDeg(ikumi.badWind[0])!,
  wavePeriod: 5,
});
show('無風+フラット', ikumi, {
  ...base,
  windSpeed: 1,
  waveHeight: 0.15,
  waveDir: letterToDeg(ikumi.goodSwell[0])!,
  wavePeriod: 7,
});
show('風中間+なじみサイズ+隣接うねり', ikumi, {
  ...base,
  windDir: letterToDeg('E')!,
  windSpeed: 6,
  waveHeight: 1.2,
  waveDir: letterToDeg('S')!,
  wavePeriod: 9,
});
show('大きすぎ(初心者ポイント)', irino, {
  ...base,
  windDir: letterToDeg(irino.goodWind[0])!,
  windSpeed: 4,
  waveHeight: 3.2,
  waveDir: letterToDeg(irino.goodSwell[0])!,
  wavePeriod: 12,
});
show('うねりデータなし', ikumi, {
  ...base,
  windDir: letterToDeg(ikumi.goodWind[0])!,
  windSpeed: 5,
  waveHeight: null,
  waveDir: null,
  wavePeriod: null,
});

// ベストタイムの健全性: 朝は嫌いな風→昼だけ良い風に変わる日
const pd: PointData = {
  curIdx: 8,
  fetchedAt: 0,
  series: {
    time: Array.from({ length: 48 }, (_, h) => `2026-11-09T${String(h).padStart(2, '0')}:00`),
    windDir: Array(48).fill(letterToDeg(ikumi.badWind[0])), // 朝: 悪い風
    windSpeed: Array(48).fill(6),
    temp: Array(48).fill(20),
    waveHeight: Array(48).fill(1.0),
    waveDir: Array(48).fill(letterToDeg(ikumi.goodSwell[0])),
    wavePeriod: Array(48).fill(8),
  },
};
for (let h = 12; h <= 15; h++) pd.series.windDir[h] = letterToDeg(ikumi.goodWind[0])!; // 昼だけ良い風
const bi = bestHourIdx(pd, ikumi);
console.log('bestHour =', bi != null ? pd.series.time[bi] : null, '(12〜15時のいずれかであるべき)');
console.log('08時の評価 =', evaluatePoint(ikumi, forecastAt(pd, 8))?.score, '(低いはず)');
console.log('13時の評価 =', evaluatePoint(ikumi, forecastAt(pd, 13))?.score, '(高いはず)');
