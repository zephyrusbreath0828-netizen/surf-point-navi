import type { Bottom, Level, PointData, SurfPoint } from '../types.ts';
import { DEFAULT_POINTS } from './defaultPoints.ts';

const POINTS_KEY = 'ssn.points.v1';
const CACHE_KEY = 'ssn.cache.v1';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normalize(raw: unknown): SurfPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  let sizeMin = clamp(Number(p.sizeMin) || 0.6, 0.2, 3);
  let sizeMax = clamp(Number(p.sizeMax) || 1.4, 0.3, 5);
  if (sizeMin > sizeMax) [sizeMin, sizeMax] = [sizeMax, sizeMin];
  const id = typeof p.id === 'string' && p.id ? p.id : genId();
  return {
    id,
    name: String(p.name ?? '無名ポイント').slice(0, 30),
    lat,
    lng,
    bearing: (((Number(p.bearing) || 0) % 360) + 360) % 360,
    sizeMin,
    sizeMax,
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

export function loadPoints(): SurfPoint[] {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    if (!raw) return structuredClone(DEFAULT_POINTS);
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return structuredClone(DEFAULT_POINTS);
    const pts = arr.map(normalize).filter((x): x is SurfPoint => x != null);
    return pts.length > 0 ? pts : structuredClone(DEFAULT_POINTS);
  } catch {
    return structuredClone(DEFAULT_POINTS);
  }
}

export function savePoints(points: SurfPoint[]): void {
  try {
    localStorage.setItem(POINTS_KEY, JSON.stringify(points));
  } catch {
    /* 保存できなくても動作は続行 */
  }
}

export interface ForecastCache {
  fetchedAt: number;
  data: Record<string, PointData>;
}

export function loadForecastCache(): ForecastCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as ForecastCache;
    if (!j || typeof j.fetchedAt !== 'number' || !j.data) return null;
    return j;
  } catch {
    return null;
  }
}

export function saveForecastCache(c: ForecastCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* 容量オーバー等は無視 */
  }
}

export function isSameTokyoDay(ts: number): boolean {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(new Date(ts)) === f.format(new Date());
}
