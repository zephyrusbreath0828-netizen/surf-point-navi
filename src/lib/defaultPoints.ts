import type { SurfPoint } from '../types.ts';
import { loadRegionData } from '../data/index.ts';

/**
 * 互換モジュール(旧 defaultPoints.ts)。
 *
 * ポイントデータの単一ソースは src/data/regions/*.json(地方別JSON)。
 * このファイルは旧コードからの import でも壊れないよう、
 * loadRegionData() の結合結果を SurfPoint[] として再エクスポートする。
 *
 * SurfPoint 型(src/types.ts)がサポートするプロパティ:
 *   id / name / prefecture / lat / lon /
 *   goodWind / badWind / goodSwell (16方位の方位記号配列) /
 *   waveMin / waveMax (なじみサイズ m) / (+ region / level / bottom)
 */
export const DEFAULT_POINTS: SurfPoint[] = loadRegionData();

export default DEFAULT_POINTS;
