import type { Bottom, DirLetter, Level, SurfPoint } from '../types.ts';
import { LETTERS16 } from './format.ts';

const LETTER_SET = new Set<string>(LETTERS16);

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** goodWind/badWind/goodSwell の方向リストを検証・正規化(大文字化・重複除去・16方位のみ許容) */
function dirList(v: unknown): DirLetter[] {
  if (!Array.isArray(v)) return [];
  const out = v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().toUpperCase())
    .filter((x) => LETTER_SET.has(x));
  return [...new Set(out)] as DirLetter[];
}

/**
 * どの供給元(JSON / localStorage)でも同じ型に落とす正規化。
 * 旧形式(lng/sizeMin/sizeMax)も読み替えて吸収する。
 */
export function normalizePoint(raw: unknown, region = ''): SurfPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const lat = Number(p.lat);
  const lon = Number(p.lon ?? p.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;

  let waveMin = clamp(Number(p.waveMin ?? p.sizeMin) || 0.6, 0.2, 4);
  let waveMax = clamp(Number(p.waveMax ?? p.sizeMax) || 1.4, 0.3, 6);
  if (waveMin > waveMax) [waveMin, waveMax] = [waveMax, waveMin];

  return {
    id: typeof p.id === 'string' && p.id ? p.id : genId(),
    name: String(p.name ?? '無名ポイント').slice(0, 30),
    prefecture: String(p.prefecture ?? '').slice(0, 12),
    region,
    lat,
    lon,
    goodWind: dirList(p.goodWind),
    badWind: dirList(p.badWind),
    goodSwell: dirList(p.goodSwell),
    waveMin,
    waveMax,
    level: (p.level === 'intermediate' ? 'intermediate' : 'beginner') as Level,
    bottom: (p.bottom === 'reef' || p.bottom === 'mix' ? p.bottom : 'sand') as Bottom,
  };
}

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallthrough */
    }
  }
  return `p${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}
