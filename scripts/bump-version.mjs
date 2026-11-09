#!/usr/bin/env node
/**
 * バージョン自動更新スクリプト。
 *
 *   node scripts/bump-version.mjs minor  → 1.7.0 → 1.8.0 (機能追加)
 *   node scripts/bump-version.mjs patch  → 1.7.0 → 1.7.1 (軽微修正)
 *
 * package.json の version と src/lib/version.ts の APP_VERSION を同時更新する。
 * アプリ内表示は APP_VERSION を参照するため、このスクリプト1発で同期される。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const verTsPath = join(root, 'src', 'lib', 'version.ts');

const kind = process.argv[2];
if (kind !== 'minor' && kind !== 'patch') {
  console.error('usage: node scripts/bump-version.mjs minor|patch');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [maj, min, pat] = pkg.version.replace(/^v/, '').split('.').map(Number);
const next =
  kind === 'minor'
    ? `${maj}.${min + 1}.0`
    : `${maj}.${min}.${pat + 1}`;

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const head = `/**
 * アプリバージョン(単一ソース)。
 * 更新は scripts/bump-version.mjs が行う:
 *   npm run bump:minor  → 機能追加 (x.y.0 → x.y+1.0)
 *   npm run bump:patch  → 軽微修正 (x.y.z → x.y.z+1)
 * package.json の version とこのファイルは常に同期される。
 * アプリ内表示(管理画面フッター等)はこの定数を参照する。
 */
export const APP_VERSION = '${next}';
`;
writeFileSync(verTsPath, head);

console.log(`version bumped: v${pkg.version} -> v${next} (package.json + src/lib/version.ts)`);
