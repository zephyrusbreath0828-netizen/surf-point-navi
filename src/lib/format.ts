import type { Bottom, Level, WindTag } from '../types.ts';

export const DIRS16 = [
  '北', '北北東', '北東', '東北東',
  '東', '東南東', '南東', '南南東',
  '南', '南南西', '南西', '西南西',
  '西', '西北西', '北西', '北北西',
] as const;

export function dir16(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return '—';
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return DIRS16[i];
}

/** 2つの方位の差(0〜180度) */
export function angDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** 波高(m)をサーファー用語のサイズ表記に */
export function sizeLabel(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return '—';
  if (m < 0.2) return 'フラット';
  if (m < 0.5) return 'ヒザ';
  if (m < 0.8) return 'コシ';
  if (m < 1.1) return 'ハラ';
  if (m < 1.4) return 'ムネ';
  if (m < 1.7) return 'カタ';
  if (m < 2.0) return 'ヘッド';
  if (m < 2.3) return '頭上';
  return 'オーバーヘッド';
}

export function sizeRangeLabel(min: number, max: number): string {
  return `${sizeLabel(min)}〜${sizeLabel(max)}`;
}

export const WIND_TAG_LABEL: Record<WindTag, string> = {
  calm: '無風',
  off: 'オフショア',
  'side-off': 'サイドオフ',
  side: 'サイド',
  'side-on': 'サイドオン',
  on: 'オンショア',
};

export function levelLabel(l: Level): string {
  return l === 'beginner' ? '初心者OK' : '中級以上';
}

export function bottomLabel(b: Bottom): string {
  return b === 'sand' ? 'サンド' : b === 'reef' ? 'リーフ' : 'ミックス';
}

export function fmtHM(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date());
}
