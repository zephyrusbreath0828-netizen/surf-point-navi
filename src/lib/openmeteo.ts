import type { HourlySeries, PointData, SurfPoint } from '../types.ts';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (j && j.error) throw new Error(j.reason || 'API error');
  return j;
}

/** 海洋API(うねり)。cell_selection=sea で海岸に近い海側セルを掴む。失敗したらパラメータなしで再試行 */
async function getMarine(lat: string, lon: string): Promise<any | null> {
  const base = `${MARINE_URL}?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period&timezone=Asia%2FTokyo&forecast_days=2`;
  try {
    return await getJson(`${base}&cell_selection=sea`);
  } catch {
    try {
      return await getJson(base);
    } catch {
      return null;
    }
  }
}

/** 現在時刻(日本)に対応する hourly 配列の index */
function curIndex(times: string[]): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const key = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`;
  const exact = times.indexOf(key);
  if (exact >= 0) return exact;
  let last = 0;
  for (let j = 0; j < times.length; j++) {
    if (times[j] <= key) last = j;
  }
  return last;
}

/** 1リクエストに詰められる最大地点数(URL長とAPI上限の保険) */
const CHUNK_SIZE = 40;

/**
 * 複数ポイントの予報を Open-Meteo から取得。
 * 250+ 地点に対応するため 40 地点ずつチャンク分割し、気象+海洋をチャンク毎に並列取得。
 * 海洋APIが死んでも風・気温は生かす(うねりは null 扱い)。
 */
export async function fetchPointData(points: SurfPoint[]): Promise<Record<string, PointData>> {
  if (points.length === 0) return {};
  const chunks: SurfPoint[][] = [];
  for (let i = 0; i < points.length; i += CHUNK_SIZE) {
    chunks.push(points.slice(i, i + CHUNK_SIZE));
  }
  const parts = await Promise.all(chunks.map((c) => fetchChunk(c)));
  return Object.assign({}, ...parts);
}

async function fetchChunk(points: SurfPoint[]): Promise<Record<string, PointData>> {
  const lat = points.map((p) => p.lat.toFixed(4)).join(',');
  const lon = points.map((p) => p.lon.toFixed(4)).join(',');

  const wUrl = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Asia%2FTokyo&forecast_days=2`;
  const [wRaw, mRaw] = await Promise.all([getJson(wUrl), getMarine(lat, lon)]);

  const wArr: any[] = Array.isArray(wRaw) ? wRaw : [wRaw];
  const mArr: any[] = mRaw == null ? [] : Array.isArray(mRaw) ? mRaw : [mRaw];

  const out: Record<string, PointData> = {};
  points.forEach((p, i) => {
    const w = wArr[i];
    if (!w || !w.hourly || !Array.isArray(w.hourly.time)) return;
    const time: string[] = w.hourly.time;
    const n = time.length;
    const mh = mArr[i]?.hourly;
    const series: HourlySeries = {
      time,
      windDir: w.hourly.wind_direction_10m ?? [],
      windSpeed: w.hourly.wind_speed_10m ?? [],
      temp: w.hourly.temperature_2m ?? [],
      waveHeight: (mh?.wave_height as (number | null)[] | undefined) ?? new Array(n).fill(null),
      waveDir: (mh?.wave_direction as (number | null)[] | undefined) ?? new Array(n).fill(null),
      wavePeriod: (mh?.wave_period as (number | null)[] | undefined) ?? new Array(n).fill(null),
    };
    out[p.id] = { series, curIdx: curIndex(time), fetchedAt: Date.now() };
  });
  if (Object.keys(out).length === 0) throw new Error('予報データの形式が不正です');
  return out;
}
