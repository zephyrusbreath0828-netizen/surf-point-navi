// 検証スクリプト用ローダ(node は import.meta.glob を持たないため fs で読む)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizePoint } from '../src/lib/normalize.ts';
import type { SurfPoint } from '../src/lib/types.ts';

export function loadPointsForCheck(): SurfPoint[] {
  const dir = new URL('../src/data/regions/', import.meta.url).pathname;
  const out: SurfPoint[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const rows = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const region = f.replace(/\.json$/, '');
    for (const row of rows) {
      const p = normalizePoint(row, region);
      if (p) out.push(p);
    }
  }
  return out;
}
