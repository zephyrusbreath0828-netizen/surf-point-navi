import type { Bottom, Level, PointData, SurfPoint, UserLocation } from '../types.ts';
import { loadAllPoints } from './loadPoints.ts';
import { normalizePoint } from './normalize.ts';

const POINTS_KEY = 'ssn.points.v2'; // v2: 地方JSONスキーマ(goodWind/badWind/goodSwell/waveMin/waveMax)
const CACHE_KEY = 'ssn.cache.v1';
const LOC_KEY = 'ssn.loc.v1';

export function loadPoints(): SurfPoint[] {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        const pts = arr.map((x) => normalizePoint(x)).filter((x): x is SurfPoint => x != null);
        if (pts.length > 0) return pts;
      }
    }
  } catch {
    /* 壊れていれば地方JSONの初期値へ */
  }
  return loadAllPoints();
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

export function loadLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    const lat = Number(j?.lat);
    const lon = Number(j?.lon ?? j?.lng); // 旧形式も読み替え
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon, accuracy: Number(j.accuracy) || 0, ts: Number(j.ts) || Date.now() };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocation(l: UserLocation): void {
  try {
    localStorage.setItem(LOC_KEY, JSON.stringify(l));
  } catch {
    /* 無視 */
  }
}
