import type { SurfPoint } from '../types.ts';
import { normalizePoint } from '../lib/normalize.ts';

/**
 * src/data/regions/ 配下の全地方JSONを自動検出して読み込む。
 * 新しい地域(hawaii.json / indonesia.json など)は、このフォルダに
 * JSONファイルを追加するだけで読み込まれる(コード変更は不要)。
 */
const regionModules = import.meta.glob('./regions/*.json', { eager: true }) as Record<string, { default: unknown }>;

/** 地方の定義(ファイル名 → 表示名)。未登録のファイル名はそのまま表示される */
export const REGION_LABELS: Record<string, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '近畿',
  chugoku: '中国',
  shikoku: '四国',
  kyushu: '九州',
  okinawa: '沖縄',
};

export function regionIdFromFile(path: string): string {
  const m = path.match(/([^/]+)\.json$/);
  return m ? m[1] : path;
}

export function regionLabel(id: string): string {
  return REGION_LABELS[id] ?? id;
}

/**
 * 全地方JSONを結合してポイント配列を返す。
 * 例: const allPoints = [...hokkaido, ...tohoku, ...kanto, ...];
 */
export function loadRegionData(): SurfPoint[] {
  const out: SurfPoint[] = [];
  const seen = new Set<string>();
  for (const [path, mod] of Object.entries(regionModules)) {
    const region = regionIdFromFile(path);
    const rows = (mod as { default?: unknown }).default;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const p = normalizePoint(row, region);
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}
