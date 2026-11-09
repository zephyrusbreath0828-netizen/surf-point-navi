/**
 * ユーザー登録ポイントのメタ情報管理(localStorage)。
 *
 * - ポイント本体は既存の ssn.points.v2(SurfPoint 型そのまま)に保存
 * - 登録日時・コメントなど拡張メタはここに分離(将来Supabaseへ移行する際は
 *   このモジュールをサーバー呼び出しに差し替えるだけでコミュニティ投稿型にできる)
 * - 標準収録ポイントにはメタが無い → isUserPoint(id) === false で判別
 */
export interface UserPointMeta {
  createdAt: number;
  comment?: string;
}

const META_KEY = 'ssn.usermeta.v1';

export function loadUserMeta(): Record<string, UserPointMeta> {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw);
    return j && typeof j === 'object' ? (j as Record<string, UserPointMeta>) : {};
  } catch {
    return {};
  }
}

function saveMeta(m: Record<string, UserPointMeta>): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* 保存できなくても動作は続行 */
  }
}

export function addUserPointMeta(id: string, comment?: string): void {
  const m = loadUserMeta();
  m[id] = { createdAt: Date.now(), comment: comment || undefined };
  saveMeta(m);
}

export function getUserPointMeta(id: string): UserPointMeta | null {
  return loadUserMeta()[id] ?? null;
}

export function isUserPoint(id: string): boolean {
  return !!loadUserMeta()[id];
}

export function removeUserPointMeta(id: string): void {
  const m = loadUserMeta();
  delete m[id];
  saveMeta(m);
}

export function clearUserMeta(): void {
  saveMeta({});
}
