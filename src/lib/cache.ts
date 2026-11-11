/**
 * 起動高速化用キャッシュ管理。
 *
 * - 気象(予報)キャッシュ: storage.ts の ssn.cache.v1 を利用(実データ一式)
 * - ランキングスナップショット: 評価結果(スコア・星・ラベル)と取得日時を保存
 * - 有効期限は 3 時間。期限内の再アクセスでは Open-Meteo に再取得しない
 *
 * 将来の拡張(海域別キャッシュ・世界対応)も、このモジュールのキー設計を
 * 拡張するだけで吸収できる。
 */
import type { Evaluation, Ranked } from '../types.ts';

/** キャッシュ有効期限(3時間) */
export const RANK_TTL_MS = 3 * 60 * 60 * 1000;

const RANK_KEY = 'ssn.rank.v1';

export interface RankSnapshot {
  id: string;
  score: number;
  stars: number;
  label: string;
}

export interface RankCache {
  fetchedAt: number;
  items: RankSnapshot[];
}

export function loadRankCache(): RankCache | null {
  try {
    const raw = localStorage.getItem(RANK_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as RankCache;
    if (!j || typeof j.fetchedAt !== 'number' || !Array.isArray(j.items)) return null;
    return j;
  } catch {
    return null;
  }
}

export function saveRankCache(ranked: Ranked[], fetchedAt: number): void {
  try {
    const items: RankSnapshot[] = ranked
      .filter((r) => r.ev != null)
      .map((r) => ({ id: r.point.id, score: r.ev!.score, stars: r.ev!.stars, label: r.ev!.label }));
    localStorage.setItem(RANK_KEY, JSON.stringify({ fetchedAt, items } satisfies RankCache));
  } catch {
    /* 保存できなくても動作は続行 */
  }
}

export function clearRankCache(): void {
  try {
    localStorage.removeItem(RANK_KEY);
  } catch {
    /* 無視 */
  }
}

/** 取得日時が有効期限(3時間)以内なら true */
export function isFresh(ts: number | null | undefined): boolean {
  return ts != null && Date.now() - ts < RANK_TTL_MS;
}

/** スナップショットから最小限の Evaluation を復元(起動直後の暫定表示用) */
export function evFromSnapshot(s: RankSnapshot): Evaluation {
  return {
    score: s.score,
    stars: s.stars,
    label: s.label,
    reasons: ['保存した前回ランキングを表示中。最新データに更新されると詳細が表示されます'],
    windTag: 'calm',
    windDirName: '—',
    windSpeed: 0,
    waveHeight: null,
    waveDirName: '—',
    wavePeriod: null,
    temp: 0,
  };
}
