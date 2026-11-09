import { useMemo, useState, type ReactNode } from 'react';
import type { Ranked } from '../types.ts';
import type { Evaluation } from '../lib/score.ts';
import { WIND_TAG_LABEL, fmtHM, sizeLabel, todayLabel } from '../lib/format.ts';
import { fmtKm } from '../lib/distance.ts';
import { REGIONS, prefecturesFor } from '../lib/regions.ts';
import type { PointFilters, DistLimit, SortKey, ViewLimit } from '../hooks/usePointFilters.ts';
import { StarRating } from './StarRating.tsx';
import { ScoreRing } from './ScoreRing.tsx';
import { IconPin, IconRefresh } from './icons.tsx';

function windChipClass(tag: Evaluation['windTag']): string {
  if (tag === 'off' || tag === 'side-off') return 'bg-lagoon-500/10 text-lagoon-600';
  if (tag === 'calm') return 'bg-neutral-500/10 text-neutral-500';
  return 'bg-coral-500/10 text-coral-500';
}

function RankBadge({ rank }: { rank: number }) {
  const style = rank === 1 ? 'bg-sun-500 text-ocean-950' : rank === 2 ? 'bg-[#c9cdd6] text-ocean-900' : 'bg-[#d9a06b] text-white';
  return (
    <div className={`${style} w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-lg italic shadow-sm shrink-0`}>
      {rank}
    </div>
  );
}

function RankCard({ rank, r, onOpen }: { rank: number; r: Ranked; onOpen: (id: string) => void }) {
  const ev = r.ev!;
  return (
    <button
      onClick={() => onOpen(r.point.id)}
      className="w-full text-left bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 active:scale-[0.985] transition-transform"
    >
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg text-ocean-950 leading-tight truncate">{r.point.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sand-100 text-neutral-500 shrink-0">{r.point.prefecture}</span>
            <StarRating stars={ev.stars} />
            {r.dist != null && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-neutral-400 shrink-0">
                <IconPin className="w-3 h-3" />
                現在地から{fmtKm(r.dist)}
              </span>
            )}
          </div>
        </div>
        <ScoreRing score={ev.score} id={`rank${rank}`} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
        <span className={`px-2 py-0.5 rounded-full ${windChipClass(ev.windTag)}`}>
          {WIND_TAG_LABEL[ev.windTag]}・{ev.windDirName}風 {ev.windSpeed.toFixed(1)}m/s
        </span>
        <span className="px-2 py-0.5 rounded-full bg-ocean-900/5 text-ocean-800">
          波 {ev.waveHeight == null ? '—' : `${sizeLabel(ev.waveHeight)} ${ev.waveHeight.toFixed(1)}m`}
        </span>
        {ev.waveDirName !== '—' && (
          <span className="px-2 py-0.5 rounded-full bg-ocean-900/5 text-ocean-800">うねり {ev.waveDirName}</span>
        )}
      </div>
      <p className="mt-2.5 text-[13px] text-neutral-600 leading-relaxed">「{ev.reasons[0]}」</p>
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold text-neutral-400 mb-0.5">{label}</span>
      {children}
    </label>
  );
}

const selectCls =
  'w-full bg-white border border-sand-300 rounded-xl px-2.5 py-2 text-sm text-ocean-950 appearance-none';

function FilterPanel({ ranked, filters, geoStatus, onLocate }: {
  ranked: Ranked[];
  filters: PointFilters;
  geoStatus: 'idle' | 'loading' | 'ok' | 'error';
  onLocate: () => void;
}) {
  const prefs = useMemo(() => prefecturesFor(ranked, filters.region), [ranked, filters.region]);
  return (
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
          <select className={selectCls} value={filters.pref} onChange={(e) => filters.setPref(e.target.value)} disabled={filters.region === 'all' && prefs.length === 0}>
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
        <FilterRow label="並び替え">
          <select className={selectCls} value={filters.sort} onChange={(e) => filters.setSort(e.target.value as SortKey)}>
            <option value="score">評価順(高評価)</option>
            <option value="dist">距離順(近い)</option>
            <option value="name">名称順(五十音)</option>
          </select>
        </FilterRow>
      </div>
      <FilterRow label="表示件数">
        <select className={selectCls} value={filters.limit} onChange={(e) => filters.setLimit(Number(e.target.value) as ViewLimit)}>
          <option value={10}>10件</option>
          <option value={20}>20件</option>
          <option value={50}>50件</option>
          <option value={0}>全件</option>
        </select>
      </FilterRow>
      {filters.maxDist > 0 && geoStatus !== 'ok' && (
        <p className="text-[11px] text-coral-500">
          {geoStatus === 'loading'
            ? '現在地を取得中… 取得後に自動で絞り込まれます'
            : '距離フィルタには現在地の取得許可が必要です'}
        </p>
      )}
      <div className="flex justify-end">
        <button onClick={filters.reset} className="text-xs text-neutral-400 underline">
          フィルタをリセット
        </button>
      </div>
    </div>
  );
}

export function HomeScreen({ ranked, filters, status, stale, lastFetched, refreshing, onRefresh, onOpen, geoStatus, onLocate }: {
  ranked: Ranked[];
  filters: PointFilters;
  status: 'loading' | 'ok' | 'error';
  stale: boolean;
  lastFetched: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  geoStatus: 'idle' | 'loading' | 'ok' | 'error';
  onLocate: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = filters.filtered;
  // ランキングはフィルタ後の集合からスコア順で算出(ランキング機能を維持)
  const top = useMemo(() => {
    const byScore = [...filtered].sort((a, b) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1));
    return byScore.filter((r) => r.ev != null).slice(0, 3);
  }, [filtered]);
  const shown = filters.limit === 0 ? filtered : filtered.slice(0, filters.limit);

  return (
    <div className="pb-24">
      <header className="relative overflow-hidden bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-700 text-white px-5 pt-6 pb-9 rounded-b-3xl">
        <svg className="absolute -right-8 -top-10 w-44 h-44 text-white/5" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
          <circle cx="50" cy="50" r="50" />
        </svg>
        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-foam-200/80 font-display font-bold">SURF POINT NAVI</p>
            <h1 className="text-[26px] leading-tight font-black mt-1">サーフポイントナビ</h1>
          </div>
          <button onClick={onRefresh} aria-label="予報を更新" className="p-2.5 rounded-full bg-white/10 active:bg-white/25">
            <IconRefresh className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-foam-200/90 relative">
          <span className="font-bold">{todayLabel()}</span>
          {lastFetched != null && <span>・{fmtHM(lastFetched)} 取得</span>}
          {stale && <span className="px-1.5 py-0.5 rounded bg-sun-500/20 text-sun-500 font-bold">保存した予報を表示</span>}
        </div>
      </header>

      <main className="px-4 -mt-6 relative space-y-4 pb-4">
        {status === 'error' && (
          <section className="bg-white rounded-2xl border border-coral-500/30 p-5">
            <p className="text-sm font-bold text-coral-500">予報を取得できませんでした</p>
            <p className="text-xs text-neutral-500 mt-1">通信環境を確認して、もう一度お試しください。</p>
            <button onClick={onRefresh} className="mt-3 w-full bg-ocean-900 text-white rounded-xl py-2.5 text-sm font-bold">
              再試行
            </button>
          </section>
        )}

        {/* 検索バー + フィルタ折りたたみ(デフォルト閉) */}
        <section className="space-y-2.5">
          <div className="relative">
            <input
              type="search"
              value={filters.q}
              onChange={(e) => filters.setQ(e.target.value)}
              placeholder="ポイント名・都道府県で検索(例: 生見 / 徳島)"
              className="w-full bg-white border border-sand-300/60 shadow-sm rounded-2xl pl-10 pr-24 py-3 text-sm text-ocean-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-ocean-700/30"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">🔍</span>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                panelOpen || filters.activeCount > 0
                  ? 'bg-ocean-900 text-white border-ocean-900'
                  : 'bg-sand-50 text-ocean-800 border-sand-300'
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
          {panelOpen && <FilterPanel ranked={ranked} filters={filters} geoStatus={geoStatus} onLocate={onLocate} />}
          <p className="text-[11px] text-neutral-500 px-1">
            検索結果 <span className="font-bold text-ocean-900">{filtered.length}</span>件
            <span className="text-neutral-400">・地図タブにも同じ結果を表示</span>
          </p>
        </section>

        {status === 'loading' &&
          [0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-sand-300/60 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sand-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sand-100 rounded w-2/3" />
                  <div className="h-3 bg-sand-100 rounded w-1/3" />
                </div>
                <div className="w-16 h-16 rounded-full bg-sand-100" />
              </div>
            </div>
          ))}

        {status !== 'error' && top.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between px-1 mb-2">
              <h2 className="font-black text-ocean-950">今日のおすすめランキング</h2>
              <span className="text-[10px] font-display tracking-[0.2em] text-neutral-400">TOP 3</span>
            </div>
            <div className="space-y-2.5">
              {top.map((r, i) => (
                <RankCard key={r.point.id} rank={i + 1} r={r} onOpen={onOpen} />
              ))}
            </div>
          </section>
        )}

        {status !== 'error' && shown.length > 0 && (
          <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-2">
            {shown.map((r) => (
              <button
                key={r.point.id}
                onClick={() => onOpen(r.point.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 active:bg-sand-50 rounded-xl text-left"
              >
                <span className="font-display font-bold text-neutral-300 w-5 text-center shrink-0">
                  {r.ev ? filtered.indexOf(r) + 1 : '—'}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-ocean-950 truncate">
                    {r.point.name}
                    <span className="ml-1.5 text-[10px] font-normal text-neutral-400">{r.point.prefecture}</span>
                  </span>
                  <span className="block text-[11px] text-neutral-400 truncate">
                    {r.ev ? r.ev.label : 'データ取得中…'}
                    {r.dist != null ? `・現在地から ${fmtKm(r.dist)}` : ''}
                  </span>
                </span>
                {r.ev && <StarRating stars={r.ev.stars} className="w-3.5 h-3.5" />}
                {r.ev && <span className="font-display font-extrabold text-ocean-800 w-8 text-right shrink-0">{r.ev.score}</span>}
              </button>
            ))}
          </section>
        )}

        {status !== 'error' && filtered.length > shown.length && (
          <p className="text-center text-[11px] text-neutral-400">
            残り {filtered.length - shown.length}件 — 表示件数を「全件」に変更すると全て表示されます
          </p>
        )}

        <p className="text-[10px] text-neutral-400 leading-relaxed px-1">
          予報: Open-Meteo(風・気温/波・うねり)。スコアは各ポイントの向き・なじみサイズなどの設定をもとに独自に計算した目安です。海に入る前には現地の状況を必ず確認してください。
        </p>
      </main>
    </div>
  );
}
