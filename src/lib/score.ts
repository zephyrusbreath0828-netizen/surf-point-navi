import type { Forecast, PointData, SurfPoint, WindTag } from '../types.ts';
import { angDiff, dir16, sizeLabel } from './format.ts';

export interface Evaluation {
  score: number;
  stars: number;
  label: string;
  reasons: string[];
  windTag: WindTag;
  windDirName: string;
  windSpeed: number;
  waveHeight: number | null;
  waveDirName: string;
  wavePeriod: number | null;
  temp: number;
}

/** 風の評価(最大40点): オフショアほど高く、オンショア&強風ほど低い */
function windEval(p: SurfPoint, f: Forecast): { pts: number; tag: WindTag; reasons: string[] } {
  const offDir = (p.bearing + 180) % 360; // この風向がオフショアになる
  const d = angDiff(f.windDir, offDir);
  const ws = f.windSpeed;
  const dName = dir16(f.windDir);

  if (ws < 3) {
    const pts = 32 + (3 - ws) * 1.7; // 32〜37.1
    return { pts, tag: 'calm', reasons: [`風が弱く(${ws.toFixed(1)}m/s)、面への影響は少なそう`] };
  }

  let factor: number;
  let tag: WindTag;
  const reasons: string[] = [];
  if (d <= 25) {
    factor = 1.0; tag = 'off';
    reasons.push(`${dName}風のオフショア。面が整いやすい`);
  } else if (d <= 55) {
    factor = 0.8; tag = 'side-off';
    reasons.push(`${dName}風。ややサイド寄りだが面はそこそこ保てそう`);
  } else if (d <= 100) {
    factor = 0.48; tag = 'side';
    reasons.push(`${dName}風のクロス気味。面は少し荒れそう`);
  } else if (d <= 140) {
    factor = 0.2; tag = 'side-on';
    reasons.push(`${dName}風のオンショア気味。面はざわつきそう`);
  } else {
    factor = 0.06; tag = 'on';
    reasons.push(`${dName}風のオンショア${ws >= 8 ? 'が強め' : ''}。面は期待薄`);
  }
  const strength = Math.min(1.15, 0.75 + ws / 20); // 弱い風は影響小、強風は増幅
  return { pts: Math.min(40, 40 * factor * strength), tag, reasons };
}

/** うねり・サイズの評価(最大45点): 入射角×なじみサイズ×周期 */
function swellEval(p: SurfPoint, f: Forecast): { pts: number; reasons: string[] } {
  const reasons: string[] = [];
  const h = f.waveHeight;
  const per = f.wavePeriod;
  const dName = f.waveDir == null ? '—' : dir16(f.waveDir);

  let dirF: number;
  if (f.waveDir == null) {
    dirF = 0.5;
    reasons.push('うねりの向きはデータなし(推計で判定)');
  } else {
    const s = angDiff(f.waveDir, p.bearing);
    if (s <= 30) {
      dirF = 1.0;
      reasons.push(`${dName}うねりがまっすぐ入る向き`);
    } else if (s <= 60) {
      dirF = 0.78;
      reasons.push(`${dName}うねり。やや斜めだがしっかり入る`);
    } else if (s <= 90) {
      dirF = 0.48;
      reasons.push(`${dName}のうねりは斜め入り。地形で差が出そう`);
    } else {
      dirF = 0.15;
      reasons.push(`${dName}うねりはポイント向きと合わず、入りは薄そう`);
    }
  }

  let sizeF: number;
  if (h == null) {
    sizeF = 0.5;
    reasons.push('波高データなし。推計で判定');
  } else if (h < 0.2) {
    sizeF = 0.05;
    reasons.push('サイズはフラット気味。うねりが入ってこないと厳しそう');
  } else if (h < p.sizeMin) {
    sizeF = Math.max(0.15, Math.pow(h / p.sizeMin, 1.3));
    reasons.push(`サイズは${sizeLabel(h)}程度。${sizeLabel(p.sizeMin)}〜${sizeLabel(p.sizeMax)}より小さめ`);
  } else if (h > p.sizeMax) {
    const over = (h - p.sizeMax) / p.sizeMax;
    sizeF = Math.max(0.15, 1 - over * 1.1);
    if (p.level === 'beginner' && h > p.sizeMax + 0.6) {
      sizeF *= 0.7;
      reasons.push(`サイズは${sizeLabel(h)}と大きめ。初心者には厳しいかも`);
    } else {
      reasons.push(`サイズは${sizeLabel(h)}と大きめ。ランディングに注意`);
    }
  } else {
    sizeF = 1.0;
    const span = p.sizeMax - p.sizeMin;
    if (h < p.sizeMin + span * 0.25) reasons.push(`サイズは${sizeLabel(h)}前後。なじみサイズの下寄り`);
    else if (h > p.sizeMax - span * 0.25) reasons.push(`サイズは${sizeLabel(h)}前後。なじみサイズの上寄り`);
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
  const directHit = f.waveDir != null && angDiff(f.waveDir, p.bearing) <= 30 && (per ?? 0) >= 9;
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

  // 安全用の上限ガード: フラットは高評価にしない / 倍以上はクローズアウト気味
  if (f.waveHeight != null && f.waveHeight < 0.25) score = Math.min(score, 42);
  if (f.waveHeight != null && f.waveHeight > p.sizeMax * 2) score = Math.min(score, 48);

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
