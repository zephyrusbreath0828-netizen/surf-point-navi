/**
 * ポイントの管理状態(localStorage)。
 *
 * - active: 評価対象(デフォルト。ホーム・地図・ランキング・予報取得の対象)
 * - hidden: 非表示(ホーム・地図・ランキング・予報取得から除外。管理画面で再活性化できる)
 * - candidate: 削除候補(表示は継続。管理画面で印を付けられる)
 *
 * 標準収録/ユーザー追加を問わず設定できる(標準ポイントは削除は不可だが
 * 非表示・削除候補マークは可能)。
 */
export type PointStatus = 'active' | 'hidden' | 'candidate';

const KEY = 'ssn.pointstatus.v1';
const VALID: PointStatus[] = ['active', 'hidden', 'candidate'];

export const POINT_STATUS_LABEL: Record<PointStatus, string> = {
  active: '評価対象',
  hidden: '非表示',
  candidate: '削除候補',
};

export function loadPointStatuses(): Record<string, PointStatus> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') return {};
    const out: Record<string, PointStatus> = {};
    for (const [k, v] of Object.entries(j)) {
      if (VALID.includes(v as PointStatus)) out[k] = v as PointStatus;
    }
    return out;
  } catch {
    return {};
  }
}

export function savePointStatuses(s: Record<string, PointStatus>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 保存できなくても動作は続行 */
  }
}

export function statusOf(statuses: Record<string, PointStatus>, id: string): PointStatus {
  return statuses[id] ?? 'active';
}
