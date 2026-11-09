import type { Bottom, DirLetter, Level, SurfPoint, WindTag } from '../types.ts';

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

/** 16方位の方位記序(DIRS16 と同じ順) */
export const LETTERS16: DirLetter[] = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

/** 度数 → 方位記号(N, NNE, ...) */
export function degToLetter(deg: number): DirLetter {
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return LETTERS16[i];
}

/** 方位記号 → 度数(不正な値は null) */
export function letterToDeg(l: string): number | null {
  const i = LETTERS16.indexOf(l.trim().toUpperCase() as DirLetter);
  return i < 0 ? null : i * 22.5;
}

/** 方位記号 → 日本語名(N → 北) */
export function letterJP(l: DirLetter): string {
  const i = LETTERS16.indexOf(l);
  return i < 0 ? '—' : DIRS16[i];
}

/** 方向リストの平均角度(円周平均・度) */
export function meanDirDeg(dirs: DirLetter[]): number | null {
  if (dirs.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const d of dirs) {
    const rad = ((letterToDeg(d) ?? 0) * Math.PI) / 180;
    x += Math.cos(rad);
    y += Math.sin(rad);
  }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** このポイントのオフショア方位(良いうねりの逆)。うねり設定がなければ良い風向 */
export function offshoreDir(p: SurfPoint): number | null {
  const swell = meanDirDeg(p.goodSwell);
  if (swell != null) return (swell + 180) % 360;
  return meanDirDeg(p.goodWind);
}
