import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Ranked, SurfPoint, UserLocation } from '../types.ts';
import { loadAllPoints, packLabel } from '../lib/loadPoints.ts';
import { REGIONS, prefecturesFor } from '../lib/regions.ts';
import { bottomLabel, letterJP, levelLabel, sizeRangeLabel } from '../lib/format.ts';
import { fmtKm } from '../lib/distance.ts';
import { POINT_STATUS_LABEL, statusOf, type PointStatus } from '../lib/pointStatus.ts';
import type { UserPointMeta } from '../lib/userPoints.ts';
import { isUserPoint, removeUserPointMeta, clearUserMeta } from '../lib/userPoints.ts';
import { useManageFilters, type DistLimit, type KindFilter, type ManageSortKey, type StatusFilter, type ViewLimit } from '../hooks/useManageFilters.ts';
import { scoreColor } from './MapScreen.tsx';
import { PointForm } from './PointForm.tsx';
import { IconPin, IconPlus, IconTrash } from './icons.tsx';
import { APP_VERSION } from '../lib/version.ts';

const selectCls = 'w-full bg-white border border-sand-300 rounded-xl px-2.5 py-2 text-sm text-ocean-950 appearance-none';

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold text-neutral-400 mb-0.5">{label}</span>
      {children}
    </label>
  );
}

function pointIconHtml(score: number | null): L.DivIcon {
  return L.divIcon({
    className: 'ssn-marker',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${scoreColor(score)};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitInner({ ranked }: { ranked: Ranked[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: L.LatLngTuple[] = ranked.map((r) => [r.point.lat, r.point.lon]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 60] });
  }, [map, ranked]);
  return null;
}

/** フィルタ済みポイントだけを表示するミニ地図(管理画面内・折りたたみ) */
function MiniMap({ ranked, onPick }: { ranked: Ranked[]; onPick: (id: string) => void }) {
  const pts: L.LatLngTuple[] = ranked.map((r) => [r.point.lat, r.point.lon]);
  const center: L.LatLngTuple = pts[0] ?? [33.6, 133.55];
  return (
    <div className="h-56 rounded-xl overflow-hidden border border-sand-300">
      <MapContainer center={center} zoom={pts.length === 1 ? 12 : 8} zoomControl={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitInner ranked={ranked} />
        {ranked.map((r) => (
          <Marker
            key={r.point.id}
            position={[r.point.lat, r.point.lon]}
            icon={pointIconHtml(r.ev?.score ?? null)}
            eventHandlers={{ click: () => onPick(r.point.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]}>{r.point.name}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function StatusBadge({ s, onClick }: { s: PointStatus; onClick: () => void }) {
  if (s === 'active') return null;
  const cls = s === 'hidden' ? 'bg-neutral-500/10 text-neutral-500' : 'bg-coral-500/10 text-coral-500';
  return (
    <button onClick={onClick} className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
      {POINT_STATUS_LABEL[s]}
    </button>
  );
}

export function ManageScreen({ points, rankedAll, statuses, userMeta, onChangeStatus, onChangeStatuses, onClearStatuses, geoLoc, onSaveAll, initialEdit, geoStatus, onLocate }: {
  points: SurfPoint[];
  rankedAll: Ranked[];
  statuses: Record<string, PointStatus>;
  userMeta: Record<string, UserPointMeta>;
  onChangeStatus: (id: string, s: PointStatus) => void;
  onChangeStatuses: (ids: string[], s: PointStatus) => void;
  onClearStatuses: () => void;
  geoLoc: UserLocation | null;
  onSaveAll: (pts: SurfPoint[]) => void;
  initialEdit?: string;
  geoStatus: 'idle' | 'loading' | 'ok' | 'error';
  onLocate: () => void;
}) {
  const [editing, setEditing] = useState<SurfPoint | 'new' | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filters = useManageFilters(rankedAll, geoLoc, userMeta, statuses);

  useEffect(() => {
    if (initialEdit) {
      const p = points.find((x) => x.id === initialEdit);
      if (p) setEditing(p);
    }
    // points は依存に入れない(編集開始時に一度だけ開く)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdit]);

  const save = (p: SurfPoint) => {
    const exists = points.some((x) => x.id === p.id);
    onSaveAll(exists ? points.map((x) => (x.id === p.id ? p : x)) : [...points, p]);
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!isUserPoint(id)) return; // 標準収録ポイントは削除不可
    removeUserPointMeta(id);
    onSaveAll(points.filter((x) => x.id !== id));
    setEditing(null);
  };

  const reset = () => {
    if (window.confirm('全ポイントをパックJSONの初期状態に戻します。よろしいですか?')) {
      clearUserMeta();
      onClearStatuses();
      onSaveAll(loadAllPoints());
    }
  };

  /** 状態バッジのタップで 評価対象→非表示→削除候補→評価対象 と循環 */
  const cycleStatus = (id: string) => {
    const cur = statusOf(statuses, id);
    const next: PointStatus = cur === 'active' ? 'hidden' : cur === 'hidden' ? 'candidate' : 'active';
    onChangeStatus(id, next);
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const bulk = (s: PointStatus) => {
    onChangeStatuses([...selected], s);
    setSelected(new Set());
  };

  const filtered = filters.filtered;
  const shown = filters.limit === 0 ? filtered : filtered.slice(0, filters.limit);
  const prefs = useMemo(() => prefecturesFor(rankedAll, filters.region), [rankedAll, filters.region]);

  return (
    <div className="pb-24">
      <header className="bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-700 text-white px-5 pt-6 pb-10 rounded-b-3xl">
        <p className="text-[10px] tracking-[0.25em] text-foam-200/80 font-display font-bold">MY POINTS</p>
        <h1 className="text-2xl font-black mt-1">ポイント管理</h1>
        <p className="text-xs text-foam-200/90 mt-2 leading-relaxed">
          良い風向・うねり方角・なじみサイズを設定すると、スコアと評価コメントが変わります。
        </p>
      </header>

      <main className="px-4 -mt-6 relative space-y-2.5 pb-4">
        {/* 検索バー + フィルタ折りたたみ(デフォルト閉) */}
        <section className="space-y-2.5">
          <div className="relative">
            <input
              type="search"
              value={filters.q}
              onChange={(e) => filters.setQ(e.target.value)}
              placeholder="ポイント名・都道府県・コメントで検索"
              className="w-full bg-white border border-sand-300/60 shadow-sm rounded-2xl pl-10 pr-24 py-3 text-sm text-ocean-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-ocean-700/30"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">🔍</span>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                panelOpen || filters.activeCount > 0 ? 'bg-ocean-900 text-white border-ocean-900' : 'bg-sand-50 text-ocean-800 border-sand-300'
              }`}
            >
              フィルタ
              {filters.activeCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-sun-500 text-ocean-950 text-[10px]">
                  {filters.activeCount}
                </span>
              )}
            </button>
          </div>

          {panelOpen && (
            <div className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <FilterRow label="地方">
                  <select className={selectCls} value={filters.region} onChange={(e) => filters.setRegion(e.target.value)}>
                    <option value="all">すべて</option>
                    {REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </FilterRow>
                <FilterRow label="都道府県">
                  <select className={selectCls} value={filters.pref} onChange={(e) => filters.setPref(e.target.value)}>
                    <option value="all">すべて</option>
                    {prefs.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </FilterRow>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <FilterRow label="現在地からの距離">
                  <select
                    className={selectCls}
                    value={filters.maxDist}
                    onChange={(e) => {
                      filters.setMaxDist(Number(e.target.value) as DistLimit);
                      if (geoStatus === 'idle') onLocate();
                    }}
                  >
                    <option value={0}>すべて</option>
                    <option value={50}>50km以内</option>
                    <option value={100}>100km以内</option>
                    <option value={200}>200km以内</option>
                    <option value={300}>300km以内</option>
                    <option value={500}>500km以内</option>
                  </select>
                </FilterRow>
                <FilterRow label="登録種別">
                  <select className={selectCls} value={filters.kind} onChange={(e) => filters.setKind(e.target.value as KindFilter)}>
                    <option value="all">すべて</option>
                    <option value="standard">標準収録ポイント</option>
                    <option value="user">ユーザー追加ポイント</option>
                  </select>
                </FilterRow>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <FilterRow label="管理状態">
                  <select className={selectCls} value={filters.statusF} onChange={(e) => filters.setStatusF(e.target.value as StatusFilter)}>
                    <option value="all">すべて</option>
                    <option value="active">評価対象</option>
                    <option value="hidden">非表示</option>
                    <option value="candidate">削除候補</option>
                  </select>
                </FilterRow>
                <FilterRow label="並び替え">
                  <select className={selectCls} value={filters.sort} onChange={(e) => filters.setSort(e.target.value as ManageSortKey)}>
                    <option value="score">評価順(高評価)</option>
                    <option value="dist">距離順(近い)</option>
                    <option value="name">名称順(五十音)</option>
                    <option value="new">登録日順(新しい)</option>
                    <option value="old">登録日順(古い)</option>
                  </select>
                </FilterRow>
              </div>
              <FilterRow label="表示件数">
                <select className={selectCls} value={filters.limit} onChange={(e) => filters.setLimit(Number(e.target.value) as ViewLimit)}>
                  <option value={10}>10件</option>
                  <option value={20}>20件</option>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                  <option value={0}>全件</option>
                </select>
              </FilterRow>
              {filters.maxDist > 0 && geoStatus !== 'ok' && (
                <p className="text-[11px] text-coral-500">
                  {geoStatus === 'loading' ? '現在地を取得中… 取得後に自動で絞り込まれます' : '距離フィルタには現在地の取得許可が必要です'}
                </p>
              )}
              <div className="flex justify-end">
                <button onClick={filters.reset} className="text-xs text-neutral-400 underline">フィルタをリセット</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-neutral-500">
              検索結果 <span className="font-bold text-ocean-900">{filtered.length}</span>件
            </p>
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <input
                type="checkbox"
                className="accent-ocean-900 w-3.5 h-3.5"
                checked={filtered.length > 0 && shown.every((r) => selected.has(r.point.id))}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(filtered.map((r) => r.point.id)) : new Set())
                }
              />
              すべて選択
            </label>
          </div>

          {selected.size > 0 && (
            <div className="bg-ocean-900 text-white rounded-2xl p-3 space-y-2">
              <p className="text-xs font-bold">選択中: {selected.size}件</p>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                <button onClick={() => bulk('active')} className="px-2.5 py-1.5 rounded-full bg-white/15 active:bg-white/30">評価対象に戻す</button>
                <button onClick={() => bulk('hidden')} className="px-2.5 py-1.5 rounded-full bg-white/15 active:bg-white/30">非表示にする</button>
                <button onClick={() => bulk('candidate')} className="px-2.5 py-1.5 rounded-full bg-coral-500/80 active:bg-coral-500">削除候補にする</button>
                <button onClick={() => setSelected(new Set())} className="ml-auto px-2.5 py-1.5 rounded-full underline font-normal">選択解除</button>
              </div>
              <p className="text-[10px] text-white/70">一括編集(風向・なじみサイズの一括設定)は今後のバージョンで追加予定です。</p>
            </div>
          )}
        </section>

        {/* 一覧 */}
        {shown.map((r) => {
          const p = r.point;
          const st = statusOf(statuses, p.id);
          const isUser = isUserPoint(p.id);
          const meta = userMeta[p.id];
          return (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-2 ${st === 'hidden' ? 'opacity-60 border-neutral-200' : 'border-sand-300/60'}`}>
              <input
                type="checkbox"
                className="accent-ocean-900 w-4 h-4 mt-1 shrink-0"
                checked={selected.has(p.id)}
                onChange={() => toggleSel(p.id)}
                aria-label={`${p.name}を選択`}
              />
              <button className="flex-1 min-w-0 text-left" onClick={() => setEditing(p)}>
                <div className="font-bold text-ocean-950 truncate">{p.name}</div>
                <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded-full bg-sand-100 text-neutral-500">{p.prefecture || '—'}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-sand-100 text-neutral-500">{packLabel(p.region)}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-bold ${isUser ? 'bg-lagoon-500/10 text-lagoon-600' : 'bg-ocean-900/5 text-ocean-800'}`}>
                    {isUser ? '登録ユーザー追加' : '標準データ'}
                  </span>
                  <StatusBadge s={st} onClick={() => cycleStatus(p.id)} />
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  {r.ev ? `${r.ev.score}点` : '評価 —'}
                  {r.dist != null ? `・現在地から ${fmtKm(r.dist)}` : ''}
                  {`・良い風 ${p.goodWind.length ? p.goodWind.map(letterJP).join('/') : '—'}`}
                  {`・なじみ ${sizeRangeLabel(p.waveMin, p.waveMax)}`}
                  {`・${levelLabel(p.level)}/${bottomLabel(p.bottom)}`}
                </div>
                {meta?.comment && <div className="text-[11px] text-neutral-400 mt-1 truncate">💬 {meta.comment}</div>}
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                  {meta?.createdAt ? `・登録 ${new Date(meta.createdAt).toLocaleDateString('ja-JP')}` : ''}
                </div>
              </button>
              {isUser && (
                <button
                  aria-label={`${p.name}を削除`}
                  onClick={() => {
                    if (window.confirm(`「${p.name}」を削除しますか?`)) remove(p.id);
                  }}
                  className="text-neutral-300 hover:text-coral-500 p-2 shrink-0"
                >
                  <IconTrash className="w-5 h-5" />
                </button>
              )}
            </div>
          );
        })}

        {filtered.length > shown.length && (
          <p className="text-center text-[11px] text-neutral-400">
            残り {filtered.length - shown.length}件 — 表示件数を「全件」に変更すると全て表示されます
          </p>
        )}

        <button
          onClick={() => setEditing('new')}
          className="w-full rounded-2xl border-2 border-dashed border-sand-300 py-3.5 text-ocean-700 font-bold text-sm flex items-center justify-center gap-1.5 active:bg-sand-50"
        >
          <IconPlus className="w-4 h-4" />
          ポイントを追加
        </button>

        {/* 地図連動(フィルタ後のポイントのみ) */}
        <section className="pt-1">
          <button
            onClick={() => setMapOpen((v) => !v)}
            className="w-full bg-white rounded-2xl border border-sand-300/60 shadow-sm px-4 py-3 flex items-center justify-between text-sm font-bold text-ocean-950"
          >
            <span className="flex items-center gap-2">
              <IconPin className="w-4 h-4" />
              地図で確認(フィルタ後 {filtered.length}件)
            </span>
            <span className="text-[10px] text-neutral-400">{mapOpen ? '閉じる' : '開く'}</span>
          </button>
          {mapOpen && (
            <div className="mt-2.5">
              <MiniMap
                ranked={filtered}
                onPick={(id) => {
                  const p = points.find((x) => x.id === id);
                  if (p) setEditing(p);
                }}
              />
              <p className="text-[10px] text-neutral-400 mt-1 px-1">マーカーをタップすると編集画面が開きます。</p>
            </div>
          )}
        </section>

        <div className="pt-1">
          <button onClick={reset} className="text-xs text-neutral-400 underline">
            パックJSONの初期データに戻す
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          緯度・経度は海岸付近の値を入れてください(予報は0.05°グリッドの海洋モデルから取得します)。設定はこのブラウザ内にのみ保存されます。
        </p>
        <p className="text-[11px] text-neutral-400 pt-2">surf-point-navi v{APP_VERSION}</p>
      </main>

      {editing && (
        <PointForm initial={editing} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
