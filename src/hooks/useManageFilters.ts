import { useCallback, useMemo, useState } from 'react';
import type { Ranked, UserLocation } from '../types.ts';
import type { UserPointMeta } from '../lib/userPoints.ts';
import type { PointStatus } from '../lib/pointStatus.ts';
import { statusOf } from '../lib/pointStatus.ts';

export type ManageSortKey = 'score' | 'dist' | 'name' | 'new' | 'old';
/** 登録種別フィルタ */
export type KindFilter = 'all' | 'standard' | 'user';
/** 管理状態フィルタ */
export type StatusFilter = 'all' | 'active' | 'hidden' | 'candidate';
/** 距離フィルタの上限 km。0 = すべて */
export type DistLimit = 0 | 50 | 100 | 200 | 300 | 500;
/** 一覧の最大表示件数。0 = 全件 */
export type ViewLimit = 10 | 20 | 50 | 100 | 0;

/**
 * ポイント管理画面向けの検索・フィルタ・並び替え。
 * 検索対象はポイント名・都道府県・コメント(ユーザー追加ポイントのメタ)。
 */
export function useManageFilters(
  rankedAll: Ranked[],
  geoLoc: UserLocation | null,
  userMeta: Record<string, UserPointMeta>,
  statuses: Record<string, PointStatus>
) {
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string>('all');
  const [pref, setPref] = useState<string>('all');
  const [maxDist, setMaxDist] = useState<DistLimit>(0);
  const [kind, setKind] = useState<KindFilter>('all');
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<ManageSortKey>('score');
  const [limit, setLimit] = useState<ViewLimit>(20);

  const setRegionAndResetPref = useCallback((v: string) => {
    setRegion(v);
    setPref('all');
  }, []);

  const reset = useCallback(() => {
    setQ('');
    setRegion('all');
    setPref('all');
    setMaxDist(0);
    setKind('all');
    setStatusF('all');
    setSort('score');
    setLimit(20);
  }, []);

  const filtered = useMemo(() => {
    const norm = (s: string) =>
      s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    const terms = norm(q).split(/\s+/).filter(Boolean);

    const byTerm = terms.length
      ? rankedAll.filter((r) => {
          const hay = `${norm(r.point.name)} ${norm(r.point.prefecture)} ${norm(userMeta[r.point.id]?.comment ?? '')}`;
          return terms.every((t) => hay.includes(t));
        })
      : rankedAll;

    const distActive = maxDist > 0 && geoLoc != null;
    const matched = byTerm.filter((r) => {
      if (region !== 'all' && r.point.region !== region) return false;
      if (pref !== 'all' && r.point.prefecture !== pref) return false;
      if (distActive && (r.dist == null || r.dist > maxDist)) return false;
      if (kind === 'standard' && userMeta[r.point.id]) return false;
      if (kind === 'user' && !userMeta[r.point.id]) return false;
      if (statusF !== 'all' && statusOf(statuses, r.point.id) !== statusF) return false;
      return true;
    });

    const byScore = (a: Ranked, b: Ranked) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1);
    const sorted = [...matched];
    if (sort === 'score') sorted.sort(byScore);
    else if (sort === 'dist') sorted.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity) || byScore(a, b));
    else if (sort === 'name') sorted.sort((a, b) => a.point.name.localeCompare(b.point.name, 'ja'));
    else if (sort === 'new')
      sorted.sort((a, b) => (userMeta[b.point.id]?.createdAt ?? 0) - (userMeta[a.point.id]?.createdAt ?? 0) || byScore(a, b));
    else
      sorted.sort((a, b) => (userMeta[a.point.id]?.createdAt ?? 0) - (userMeta[b.point.id]?.createdAt ?? 0) || byScore(a, b));

    return sorted;
  }, [rankedAll, q, region, pref, maxDist, geoLoc, kind, statusF, statuses, userMeta, sort]);

  const activeCount =
    (q.trim() ? 1 : 0) +
    (region !== 'all' ? 1 : 0) +
    (pref !== 'all' ? 1 : 0) +
    (maxDist > 0 ? 1 : 0) +
    (kind !== 'all' ? 1 : 0) +
    (statusF !== 'all' ? 1 : 0) +
    (sort !== 'score' ? 1 : 0) +
    (limit !== 20 ? 1 : 0);

  return {
    q, setQ,
    region, setRegion: setRegionAndResetPref,
    pref, setPref,
    maxDist, setMaxDist,
    kind, setKind,
    statusF, setStatusF,
    sort, setSort,
    limit, setLimit,
    filtered,
    activeCount,
    reset,
  };
}

export type ManageFilters = ReturnType<typeof useManageFilters>;
