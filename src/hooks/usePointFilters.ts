import { useCallback, useMemo, useState } from 'react';
import type { Ranked } from '../types.ts';

export type SortKey = 'score' | 'dist' | 'name';
/** 距離フィルタの上限 km。0 = すべて */
/** 距離フィルタの上限 km。0 = 全国(制限なし) */
export type DistLimit = 0 | 100 | 200 | 300 | 500;
/** 一覧の最大表示件数。0 = 全件 */
export type ViewLimit = 10 | 20 | 50 | 0;

/**
 * 検索・フィルタ・並び替えの状態管理と絞り込み処理(Home/Map 共有)。
 * 420点規模でも再計算は useMemo 内の O(n) 1パス+ソートのみ。
 */
export function usePointFilters(ranked: Ranked[], hasLocation: boolean) {
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string>('all');
  const [pref, setPref] = useState<string>('all');
  const [maxDist, setMaxDist] = useState<DistLimit>(200);
  const [sort, setSort] = useState<SortKey>('score');
  const [limit, setLimit] = useState<ViewLimit>(20);

  const setRegionAndResetPref = useCallback((v: string) => {
    setRegion(v);
    setPref('all');
  }, []);

  const reset = useCallback(() => {
    setQ('');
    setRegion('all');
    setPref('all');
    setMaxDist(200);
    setSort('score');
    setLimit(10);
  }, []);

  const filtered = useMemo(() => {
    // 正規化: NFKC + 小文字 + カタカナ→ひらがな(ひらがな検索でカタカナ名もヒット)
    const norm = (s: string) =>
      s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    const terms = norm(q).split(/\s+/).filter(Boolean);

    const byTerm = terms.length
      ? ranked.filter((r) => {
          const hay = `${norm(r.point.name)} ${norm(r.point.prefecture)}`;
          return terms.every((t) => hay.includes(t));
        })
      : ranked;

    const distActive = maxDist > 0 && hasLocation;
    const matched = byTerm.filter((r) => {
      if (region !== 'all' && r.point.region !== region) return false;
      if (pref !== 'all' && r.point.prefecture !== pref) return false;
      if (distActive && (r.dist == null || r.dist > maxDist)) return false;
      return true;
    });

    const byScore = (a: Ranked, b: Ranked) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1);
    const sorted = [...matched];
    if (sort === 'score') sorted.sort(byScore);
    else if (sort === 'dist') sorted.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity) || byScore(a, b));
    else sorted.sort((a, b) => a.point.name.localeCompare(b.point.name, 'ja'));

    return sorted;
  }, [ranked, q, region, pref, maxDist, hasLocation, sort]);

  const activeCount =
    (q.trim() ? 1 : 0) +
    (region !== 'all' ? 1 : 0) +
    (pref !== 'all' ? 1 : 0) +
    (maxDist !== 200 ? 1 : 0) +
    (sort !== 'score' ? 1 : 0) +
    (limit !== 20 ? 1 : 0);

  return {
    q, setQ,
    region, setRegion: setRegionAndResetPref,
    pref, setPref,
    maxDist, setMaxDist,
    sort, setSort,
    limit, setLimit,
    filtered,
    activeCount,
    reset,
  };
}

export type PointFilters = ReturnType<typeof usePointFilters>;
