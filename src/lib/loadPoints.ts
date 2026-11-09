import type { SurfPoint } from '../types.ts';
import { normalizePoint } from './normalize.ts';

/**
 * ポイントロード処理(ハイブリッド構成の中心)。
 *
 * - データ本体: src/data/packs/*.json(地方・地域ごとのパック)
 * - 型定義: src/types.ts の SurfPoint
 * - このファイル: JSON の読み込み・結合・検証だけを担当
 *
 * 新しい地域(usa-california.json / indonesia-bali.json など)は
 * packs/ に JSON を置くだけで読み込まれる。既存コードの修正は不要。
 */
const packModules = import.meta.glob('../data/packs/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

/** パックID(ファイル名) → 表示名。未登録のパックはファイル名がそのまま表示される */
export const PACK_LABELS: Record<string, string> = {
  'japan-hokkaido': '北海道',
  'japan-tohoku': '東北',
  'japan-kanto': '関東',
  'japan-chubu': '中部',
  'japan-kinki': '近畿',
  'japan-chugoku': '中国',
  'japan-shikoku': '四国',
  'japan-kyushu': '九州',
  'japan-okinawa': '沖縄',
  custom: 'カスタム',
};

export function packIdFromPath(path: string): string {
  const m = path.match(/([^/]+)\.json$/);
  return m ? m[1] : path;
}

export function packLabel(id: string): string {
  return PACK_LABELS[id] ?? id;
}

/**
 * 全パック JSON を結合してポイント配列を返す。
 *
 *   const allPoints = loadAllPoints();
 *
 * 内部で [...japanHokkaido, ...japanTohoku, ...] 相当の結合を行い、
 * 1件ずつ SurfPoint として検証・正規化する(id 重複は最初の 1 件のみ採用)。
 */
export function loadAllPoints(): SurfPoint[] {
  const out: SurfPoint[] = [];
  const seen = new Set<string>();
  for (const [path, mod] of Object.entries(packModules)) {
    const pack = packIdFromPath(path);
    const rows = (mod as { default?: unknown }).default;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const p = normalizePoint(row, pack);
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}
