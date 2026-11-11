/**
 * アプリバージョン(単一ソース)。
 * 更新は scripts/bump-version.mjs が行う:
 *   npm run bump:minor  → 機能追加 (x.y.0 → x.y+1.0)
 *   npm run bump:patch  → 軽微修正 (x.y.z → x.y.z+1)
 * package.json の version とこのファイルは常に同期される。
 * アプリ内表示(管理画面フッター等)はこの定数を参照する。
 */
export const APP_VERSION = '1.21.0';
