import type { Evaluation, Forecast, PointData, SurfPoint, WindTag, DirLetter } from '../types.ts';
import { LETTERS16, degToLetter, dir16, sizeLabel } from './format.ts';

export type { Evaluation };

/** 風速による増幅(弱風は影響小・強風は増幅) */
function windStrength(ws: number): number {
  return Math.min(1.15, 0.75 + ws / 20);
}

/** letter が方向リストに「含まれるか / 1ステップ隣(22.5°)か」を判定 */
function relate(letter: DirLetter, list: DirLetter[]): { main: boolean; adj: boolean } {
  if (list.length === 0) return { main: false, adj: false };
  const i = LETTERS16.indexOf(letter);
  if (i < 0) return { main: false, adj: false };
  const adj = list.some((l) => {
    const j = LETTERS16.indexOf(l);
    if (j < 0) return false;
    const d = Math.abs(i - j);
    return d === 1 || d === 15;
  });
  return { main: list.includes(letter), adj };
}

/** 風の評価(最大40点): goodWind に近いほど高く、badWind&強風ほど低い */
function windEval(p: SurfPoint, f: Forecast): { pts: number; tag: WindTag; reasons: string[] } {
  const ws = f.windSpeed;
  const letter = degToLetter(f.windDir);
  const name = dir16(f.windDir);

  if (ws < 3) {
    const pts = Math.min(40, 32 + (3 - ws) * 1.7); // 32〜37.1
    return { pts, tag: 'calm', reasons: [`風が弱く(${ws.toFixed(1)}m/s)、面への影響は少なそう`] };
  }

  const good = relate(letter, p.goodWind);
  const bad = relate(letter, p.badWind);

  if (good.main) {
    return {
      pts: Math.min(40, 40 * windStrength(ws)),
      tag: 'off',
      reasons: [`${name}風(${letter})はこのポイントの良い風向。面が整いやすい`],
    };
  }
  if (bad.main) {
    return {
      pts: 40 * 0.08 * windStrength(ws),
      tag: 'on',
      reasons: [`${name}風(${letter})はこのポイントが嫌う風向。面は期待薄`],
    };
  }
  if (good.adj) {
    return {
      pts: 40 * 0.75 * windStrength(ws),
      tag: 'side-off',
      reasons: [`${name}風は良い風向に近く、面はそこそこ保てそう`],
    };
  }
  if (bad.adj) {
    return {
      pts: 40 * 0.28 * windStrength(ws),
      tag: 'side-on',
      reasons: [`${name}風は悪い風向に近く、面はざわつきそう`],
    };
  }
  return {
    pts: 40 * 0.5 * windStrength(ws),
    tag: 'side',
    reasons: [`${name}風。良い風でも嫌いな風でもないので、面はほどほど`],
  };
}

/** うねり・サイズの評価(最大45点): 入射角×なじみサイズ×周期 */
function swellEval(p: SurfPoint, f: Forecast): { pts: number; reasons: string[] } {
  const reasons: string[] = [];
  const h = f.waveHeight;
  const per = f.wavePeriod;
  const letter = f.waveDir == null ? null : degToLetter(f.waveDir);
  const dName = f.waveDir == null ? '—' : dir16(f.waveDir);

  let dirF: number;
  if (letter == null) {
    dirF = 0.5;
    reasons.push('うねりの向きはデータなし(推計で判定)');
  } else if (p.goodSwell.includes(letter)) {
    dirF = 1.0;
    reasons.push(`${dName}うねりがまっすぐ入る向き`);
  } else if (relate(letter, p.goodSwell).adj) {
    dirF = 0.65;
    reasons.push(`${dName}うねり。やや斜めだがしっかり入る`);
  } else {
    dirF = 0.3;
    reasons.push(`${dName}うねりはこのポイント向きの入射ではなく、入りは薄そう`);
  }

  let sizeF: number;
  if (h == null) {
    sizeF = 0.5;
    reasons.push('波高データなし。推計で判定');
  } else if (h < 0.2) {
    sizeF = 0.05;
    reasons.push('サイズはフラット気味。うねりが入ってこないと厳しそう');
  } else if (h < p.waveMin) {
    sizeF = Math.max(0.15, Math.pow(h / p.waveMin, 1.3));
    reasons.push(`サイズは${sizeLabel(h)}程度。${sizeLabel(p.waveMin)}〜${sizeLabel(p.waveMax)}より小さめ`);
  } else if (h > p.waveMax) {
    const over = (h - p.waveMax) / p.waveMax;
    sizeF = Math.max(0.15, 1 - over * 1.1);
    if (p.level === 'beginner' && h > p.waveMax + 0.6) {
      sizeF *= 0.7;
      reasons.push(`サイズは${sizeLabel(h)}と大きめ。初心者には厳しいかも`);
    } else {
      reasons.push(`サイズは${sizeLabel(h)}と大きめ。ランディングに注意`);
    }
  } else {
    sizeF = 1.0;
    const span = p.waveMax - p.waveMin;
    if (h < p.waveMin + span * 0.25) reasons.push(`サイズは${sizeLabel(h)}前後。なじみサイズの下寄り`);
    else if (h > p.waveMax - span * 0.25) reasons.push(`サイズは${sizeLabel(h)}前後。なじみサイズの上寄り`);
    else reasons.push(`サイズは${sizeLabel(h)}前後。なじみサイズど真ん中`);
  }

  let perF: number;
  if (per == null) {
    perF = 0.85;
  } else if (per >= 10) {
    perF = 1.0;
    reasons.push(`うねりの周期が${Math.round(per)}秒と長く、質の良い波になりそう`);
  } else if (per >= 8) {
    perF = 0.95;
  } else if (per >= 6) {
    perF = 0.85;
  } else {
    perF = 0.7;
    reasons.push(`周期が${Math.round(per)}秒と短く、ちぎれた波になりやすい`);
  }

  const base = 0.5 * dirF + 0.35 * sizeF + 0.15 * perF;
  const directHit = letter != null && p.goodSwell.includes(letter) && (per ?? 0) >= 9;
  return { pts: 45 * base * (directHit ? 1.05 : 1), reasons };
}

function grade(score: number): [stars: number, label: string] {
  if (score >= 85) return [5, 'イチオシ'];
  if (score >= 70) return [4, '良さそう'];
  if (score >= 53) return [3, 'まあまあ'];
  if (score >= 36) return [2, 'いまいち'];
  return [1, '今日はお休みも'];
}

/** 1時刻の予報からポイントの評価を計算 */
export function evaluatePoint(p: SurfPoint, f?: Forecast | null): Evaluation | null {
  if (!f) return null;
  const w = windEval(p, f);
  const sw = swellEval(p, f);
  let score = Math.round(w.pts + sw.pts);

  // 安全用の上限ガード: フラットは高評価にしない / なじみサイズの倍以上はクローズアウト気味
  if (f.waveHeight != null && f.waveHeight < 0.25) score = Math.min(score, 42);
  if (f.waveHeight != null && f.waveHeight > p.waveMax * 2) score = Math.min(score, 48);

  score = Math.max(0, Math.min(100, score));
  const [stars, label] = grade(score);
  return {
    score,
    stars,
    label,
    reasons: [...w.reasons, ...sw.reasons],
    windTag: w.tag,
    windDirName: dir16(f.windDir),
    windSpeed: f.windSpeed,
    waveHeight: f.waveHeight,
    waveDirName: f.waveDir == null ? '—' : dir16(f.waveDir),
    wavePeriod: f.wavePeriod,
    temp: f.temp,
  };
}

export function forecastAt(pd: PointData, i: number): Forecast {
  const s = pd.series;
  return {
    time: s.time[i],
    windDir: s.windDir[i] ?? 0,
    windSpeed: s.windSpeed[i] ?? 0,
    waveHeight: s.waveHeight[i] ?? null,
    waveDir: s.waveDir[i] ?? null,
    wavePeriod: s.wavePeriod[i] ?? null,
    temp: s.temp[i] ?? 0,
  };
}

export function currentForecast(pd: PointData): Forecast {
  return forecastAt(pd, pd.curIdx);
}

/** 本日(6〜19時・現在以降)で最もスコアが高くなる時間のindex */
export function bestHourIdx(pd: PointData, p: SurfPoint): number | null {
  const day = pd.series.time[pd.curIdx]?.slice(0, 10);
  if (!day) return null;
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < pd.series.time.length; i++) {
    if (!pd.series.time[i].startsWith(day)) continue;
    const hour = parseInt(pd.series.time[i].slice(11, 13), 10);
    if (hour < 6 || hour > 19 || i < pd.curIdx) continue;
    const ev = evaluatePoint(p, forecastAt(pd, i));
    if (ev && ev.score > bestScore) {
      bestScore = ev.score;
      best = i;
    }
  }
  return best >= 0 ? best : null;
}
