/**
 * 潮汐(潮位)情報。
 *
 * データソースは Open-Meteo Marine API の sea_level_height_msl(毎時潮位)。
 * 将来の差し替え前提: fetchTideExtremes だけがデータ取得に依存するので、
 * WorldTides API / Stormglass API / 気象庁潮位データへ移す際はこの関数を
 * 各APIのレスポンスに合わせて実装し直すだけで UI・評価は無変更で動く。
 */
import type { HourlySeries, TidePreference } from '../types.ts';

export type ExtremeType = 'high' | 'low';

export interface TideExtreme {
  /** ISO時刻(現地タイムゾーン) */
  time: string;
  type: ExtremeType;
  /** 潮位(m, 平均海面基準) */
  height: number;
}

export interface TideInfo {
  /** 現在の潮位(m, 平均海面基準)。データが無い場合は null */
  current: number | null;
  /** 上げ潮 / 下げ潮(判定不能なら null) */
  trend: 'rising' | 'falling' | null;
  /** 24時間窓内の満潮・干潮リスト(時刻順) */
  extremes: TideExtreme[];
  /** 次の満潮 or 干潮 */
  nextExtreme: TideExtreme | null;
  /** 大潮 / 中潮 / 小潮 / 長潮 / 若潮(月齢から算出) */
  phaseName: string;
  /** 一日の潮位範囲に対する現在位置 0(最低)〜1(最高)。データが無ければ null */
  level01: number | null;
}

/** 月齢(0=新月, 14.77=満月)。既知新月(2000-01-06 18:14 UTC)からの経過で概算 */
export function moonAge(date: Date): number {
  const epoch = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = date.getTime() / 86400000;
  const synodic = 29.530588853;
  const age = (days - epoch) % synodic;
  return age < 0 ? age + synodic : age;
}

/** 月齢 → 潮回り(大潮/中潮/小潮/長潮/若潮) */
export function tidePhaseName(date: Date): string {
  const age = Math.floor(moonAge(date)) % 30;
  if (age <= 1 || (age >= 13 && age <= 15) || age === 29) return '大潮';
  if ((age >= 2 && age <= 5) || (age >= 16 && age <= 19) || age === 12 || age === 28) return '中潮';
  if ((age >= 6 && age <= 8) || (age >= 20 && age <= 22)) return '小潮';
  if (age === 9 || age === 23) return '長潮';
  return '若潮'; // 10, 11, 24..27 の残り
}

/** 毎時潮位系列から満潮・干潮(極値)を抽出 */
function localExtremes(times: string[], levels: (number | null)[]): TideExtreme[] {
  const out: TideExtreme[] = [];
  for (let i = 1; i < levels.length - 1; i++) {
    const prev = levels[i - 1];
    const cur = levels[i];
    const next = levels[i + 1];
    if (prev == null || cur == null || next == null) continue;
    if (cur >= prev && cur > next) out.push({ time: times[i], type: 'high', height: cur });
    else if (cur <= prev && cur < next) out.push({ time: times[i], type: 'low', height: cur });
  }
  return out;
}

/** シリーズ(過去1h〜48hの毎時潮位)から潮汐情報を組み立てる */
export function buildTideInfo(series: HourlySeries, curIdx: number, now: Date = new Date()): TideInfo {
  const empty: TideInfo = {
    current: null, trend: null, extremes: [], nextExtreme: null,
    phaseName: tidePhaseName(now), level01: null,
  };
  const levels = (series as unknown as { seaLevel?: (number | null)[] }).seaLevel;
  if (!levels || levels.length !== series.time.length) return empty;

  const idx = Math.max(0, Math.min(curIdx, levels.length - 1));
  const cur = levels[idx];
  // 上げ/下げ: 前後30分〜1時間の増減で判定
  const before = levels[idx - 1];
  const after = levels[idx + 1];
  let trend: TideInfo['trend'] = null;
  if (cur != null && after != null && before != null) trend = after >= cur ? 'rising' : 'falling';
  else if (cur != null && after != null) trend = after >= cur ? 'rising' : 'falling';
  else if (cur != null && before != null) trend = cur >= before ? 'rising' : 'falling';

  // 極値は「現在時刻の前後24h」を窓にする
  const all = localExtremes(series.time, levels);
  const win: TideExtreme[] = [];
  const nowMs = new Date(series.time[idx]).getTime();
  for (const e of all) {
    const dt = (new Date(e.time).getTime() - nowMs) / 3600000;
    if (dt >= -24 && dt <= 24) win.push(e);
  }
  const next = win.find((e) => new Date(e.time).getTime() >= nowMs) ?? null;

  // 0〜1 の潮位位置(当日のmin-max基準)
  const valid = levels.filter((v): v is number => v != null).slice(Math.max(0, idx - 12), idx + 13);
  let level01: number | null = null;
  if (cur != null && valid.length > 0) {
    const mn = Math.min(...valid);
    const mx = Math.max(...valid);
    level01 = mx > mn ? (cur - mn) / (mx - mn) : 0.5;
  }

  return { current: cur, trend, extremes: win, nextExtreme: next, phaseName: tidePhaseName(now), level01 };
}

/** 潮位位置 0〜1 → 5段階の潮位帯 */
export type TideBand = 'low' | 'mid-low' | 'mid' | 'mid-high' | 'high';

export function tideBand(level01: number | null): TideBand | null {
  if (level01 == null) return null;
  if (level01 < 0.25) return 'low';
  if (level01 < 0.45) return 'mid-low';
  if (level01 < 0.6) return 'mid';
  if (level01 < 0.8) return 'mid-high';
  return 'high';
}

const BAND_JP: Record<TideBand, string> = {
  low: '潮痺れ(低)', 'mid-low': '上げ三分(中低)', mid: '中間(中)', 'mid-high': '上げ七三分(中高)', high: '満潮前後(高)',
};

export function tideBandJP(b: TideBand | null): string {
  return b ? BAND_JP[b] : '—';
}

/** 潮位帯が適正設定に合致するか('all'は常に適正) */
export function tidePrefMatch(pref: TidePreference, band: TideBand | null): boolean {
  if (pref === 'all' || band == null) return pref === 'all' && band != null ? true : pref === 'all';
  return pref === band;
}

/** tidePreference の表示ラベル */
const PREF_JP: Record<TidePreference, string> = {
  low: '干潮前後(潮痺れ寄り)', 'mid-low': '上げ三分(中低)', mid: '中間', 'mid-high': '上げ七三分(中高)', high: '満潮前後', all: '指定なし(いつでも)',
};

export function tidePrefJP(pref: TidePreference): string {
  return PREF_JP[pref];
}
