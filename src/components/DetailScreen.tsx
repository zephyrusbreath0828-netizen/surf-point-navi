import type { PointData, SurfPoint } from '../types.ts';
import { evaluatePoint, currentForecast, bestHourIdx } from '../lib/score.ts';
import { WIND_TAG_LABEL, bottomLabel, dir16, fmtHM, levelLabel, offshoreDir, sizeLabel, sizeRangeLabel } from '../lib/format.ts';
import { fmtKm } from '../lib/distance.ts';
import { StarRating } from './StarRating.tsx';
import { ScoreRing } from './ScoreRing.tsx';
import { HourlyChart } from './HourlyChart.tsx';
import { IconBack, IconCompass, IconClock, IconLocate, IconTemp, IconWave, IconWind } from './icons.tsx';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { buildTideInfo, tideBand, tideBandJP, tidePrefJP } from '../lib/tide.ts';
import { useEffect, type ReactNode } from 'react';

function Item({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-sand-50 rounded-xl p-3">
      <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400">
        {icon}
        {label}
      </div>
      <div className="text-base font-bold text-ocean-950 mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/** 直線距離の表示(ハーサイン計算結果 km → 小数第1位) */
function distText(km: number): string {
  return km < 100 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`;
}

export function DetailScreen({ point, pd, dist, onBack, onEdit, geoStatus, onLocate, userLoc }: {
  point: SurfPoint;
  pd: PointData | undefined;
  dist?: number | null;
  onBack: () => void;
  onEdit: () => void;
  geoStatus?: 'idle' | 'loading' | 'ok' | 'error';
  onLocate?: () => void;
  userLoc?: { lat: number; lon: number } | null;
}) {
  const f = pd ? currentForecast(pd) : null;
  const tide = pd ? buildTideInfo(pd.series, pd.curIdx) : null;
  const ev = f ? evaluatePoint(point, f, tide) : null;
  const best = pd ? bestHourIdx(pd, point) : null;
  const bestHour = pd && best != null ? parseInt(pd.series.time[best].slice(11, 13), 10) : null;
  const offDir = offshoreDir(point);

  return (
    <div className="pb-24">
      <header className="bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-700 text-white px-5 pt-5 pb-12 rounded-b-3xl relative">
        <button onClick={onBack} aria-label="戻る" className="absolute left-3 top-4 p-2 rounded-full bg-white/10 active:bg-white/25">
          <IconBack className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black">{point.name}</h1>
          <p className="text-[11px] text-foam-200/90 mt-1 font-mono">
            {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px]">
          {point.prefecture && <span className="px-2 py-0.5 rounded-full bg-white/10">{point.prefecture}</span>}
          {offDir != null && <span className="px-2 py-0.5 rounded-full bg-white/10">オフショア {dir16(offDir)}風</span>}
          <span className="px-2 py-0.5 rounded-full bg-white/10">なじみ {sizeRangeLabel(point.waveMin, point.waveMax)}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10">{levelLabel(point.level)}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10">{bottomLabel(point.bottom)}</span>
          {dist != null && <span className="px-2 py-0.5 rounded-full bg-white/10">現在地から {fmtKm(dist)}</span>}
        </div>
      </header>

      <main className="px-4 -mt-8 space-y-3 relative">
        {!pd && (
          <div className="bg-white rounded-2xl border p-5 text-sm text-neutral-500">
            予報データを取得できませんでした。ホーム画面から再読み込みしてください。
          </div>
        )}

        {pd && f && ev && (
          <>
            {/* 現在地からの直線距離 */}
            <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-lagoon-500/10 text-lagoon-600 flex items-center justify-center shrink-0">
                <IconLocate className="w-5 h-5" />
              </span>
              {dist != null ? (
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-neutral-400">現在地から</div>
                  <div className="text-xl font-black text-ocean-950 leading-tight">{distText(dist)}</div>
                  <div className="text-[10px] text-neutral-400">直線距離(ハーサイン計算)</div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-neutral-600 leading-snug">現在地を許可すると距離が表示されます</div>
                  {geoStatus !== 'loading' && onLocate && (
                    <button onClick={onLocate} className="mt-1.5 text-xs font-bold text-lagoon-600 underline">
                      現在地を取得する
                    </button>
                  )}
                  {geoStatus === 'loading' && <div className="text-[11px] text-neutral-400 mt-1">現在地を取得中…</div>}
                </div>
              )}
            </section>

            {/* 周辺地図(ポイント + 現在地・直線) */}
            <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4">
              <h2 className="text-sm font-bold text-ocean-950 mb-3">周辺地図</h2>
              <div className="h-[280px] rounded-xl overflow-hidden border border-sand-300">
                <MapContainer
                  center={[point.lat, point.lon]}
                  zoom={userLoc ? 10 : 13}
                  zoomControl={false}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBoth point={[point.lat, point.lon]} user={userLoc ? [userLoc.lat, userLoc.lon] : null} />
                  <Marker position={[point.lat, point.lon]} icon={waveMarker()}>
                    <DetailTip label={`${point.name}(${point.prefecture})`} />
                  </Marker>
                  {userLoc && (
                    <>
                      <Marker position={[userLoc.lat, userLoc.lon]} icon={userMarker()}>
                        <DetailTip label="現在地" />
                      </Marker>
                      <Polyline
                        positions={[[point.lat, point.lon], [userLoc.lat, userLoc.lon]]}
                        pathOptions={{ color: '#0e7490', weight: 2, dashArray: '6 6', opacity: 0.7 }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1.5 px-1">
                現在地↔ポイントの直線を表示しています(ルート案内は含まれません)。
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 flex items-center gap-4">
              <ScoreRing score={ev.score} id="detail" />
              <div className="flex-1 min-w-0">
                <StarRating stars={ev.stars} className="w-5 h-5" />
                <div className="text-lg font-black text-ocean-950 mt-1">{ev.label}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{fmtHM(pd.fetchedAt)} 取得の予報</div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4">
              <h2 className="text-sm font-bold text-ocean-950 mb-3">現在予報</h2>
              <div className="grid grid-cols-2 gap-2.5">
                <Item
                  icon={<IconWind className="w-3 h-3" />}
                  label="風向"
                  value={`${dir16(f.windDir)}風`}
                  sub={`${WIND_TAG_LABEL[ev.windTag]}・オフショアは${dir16(offDir)}風`}
                />
                <Item icon={<IconWind className="w-3 h-3" />} label="風速" value={`${f.windSpeed.toFixed(1)} m/s`} />
                <Item
                  icon={<IconWave className="w-3 h-3" />}
                  label="波高"
                  value={f.waveHeight == null ? '—' : `${f.waveHeight.toFixed(1)} m`}
                  sub={f.waveHeight == null ? undefined : `サイズ ${sizeLabel(f.waveHeight)}相当`}
                />
                <Item
                  icon={<IconCompass className="w-3 h-3" />}
                  label="うねり方向"
                  value={f.waveDir == null ? '—' : `${dir16(f.waveDir)}から`}
                  sub={f.wavePeriod != null ? `周期 ${Math.round(f.wavePeriod)}秒` : undefined}
                />
                <Item icon={<IconTemp className="w-3 h-3" />} label="気温" value={`${Math.round(f.temp)} ℃`} />
                <Item
                  icon={<IconClock className="w-3 h-3" />}
                  label="ベストタイム"
                  value={bestHour != null ? `${bestHour}時頃` : '—'}
                  sub="本日6〜19時でスコア最大"
                />
              </div>
            </section>

            {/* 潮汐情報(折りたたみ・デフォルト閉) */}
            <details className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4">
              <summary className="text-sm font-bold text-ocean-950 cursor-pointer flex items-center justify-between">
                潮汐情報
                <span className="text-[10px] font-normal text-neutral-400">タップで開閉</span>
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Item icon={<IconWave className="w-3 h-3" />} label="現在潮位" value={tide?.current != null ? `${tide.current.toFixed(2)} m` : '—'} sub={tide && tide.level01 != null ? `本日のレンジ ${(tide.level01 * 100).toFixed(0)}%` : undefined} />
                <Item icon={<IconClock className="w-3 h-3" />} label="現在状態" value={tide?.trend === 'rising' ? '上げ潮' : tide?.trend === 'falling' ? '下げ潮' : '—'} sub={tide ? `潮回り: ${tide.phaseName}` : undefined} />
                <Item
                  icon={<IconClock className="w-3 h-3" />}
                  label="次の満潮・干潮"
                  value={tide?.nextExtreme ? `${tide.nextExtreme.type === 'high' ? '満潮' : '干潮'} ${tide.nextExtreme.time.slice(11, 16)}` : '—'}
                  sub={tide?.nextExtreme ? `潮位 ${tide.nextExtreme.height.toFixed(2)}m` : undefined}
                />
                <Item icon={<IconCompass className="w-3 h-3" />} label="適正潮位" value={tidePrefJP(point.tidePreference)} sub={point.tideComment || undefined} />
              </div>
              {tide && tide.extremes.length > 0 && (
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {tide.extremes.slice(0, 6).map((e, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-sand-50 text-neutral-500">
                      {e.type === 'high' ? '満' : '干'} {e.time.slice(11, 16)} ({e.height.toFixed(2)}m)
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-neutral-400 mt-3 leading-relaxed">
                潮位はOpen-Meteo Marine(sea_level)・潮回りは月齢からの概算値です。実海面は気象庁や沿岸の観測を確認してください。
              </p>
            </details>

            <HourlyChart pd={pd} point={point} />

            <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4">
              <h2 className="text-sm font-bold text-ocean-950 mb-3">評価理由</h2>
              <ul className="space-y-2.5">
                {ev.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-neutral-700 leading-relaxed">
                    <span className="w-6 h-6 rounded-full bg-foam-200 text-ocean-800 flex items-center justify-center shrink-0">
                      <IconWave className="w-3.5 h-3.5" />
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>

            <button
              onClick={onEdit}
              className="w-full bg-white border border-ocean-800 text-ocean-800 rounded-xl py-3 text-sm font-bold active:bg-sand-100"
            >
              このポイントの条件を編集
            </button>
          </>
        )}
      </main>
    </div>
  );
}

import { Tooltip } from 'react-leaflet';
import { useMap } from 'react-leaflet';

/** ポイントと現在地の両方が収まるように表示範囲を調整 */
function FitBoth({ point, user }: { point: [number, number]; user: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!user) {
      map.setView(point, 13);
      return;
    }
    map.fitBounds(L.latLngBounds([point, user]), { padding: [40, 60] });
    // point/user は詳細画面の遷移ごとに固定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function DetailTip({ label }: { label: string }) {
  return (
    <Tooltip direction="top" offset={[0, -12]}>
      {label}
    </Tooltip>
  );
}

/** ポイント側マーカー(波アイコン風・スコアリング配色) */
function waveMarker(): L.DivIcon {
  return L.divIcon({
    className: 'ssn-marker',
    html: `<span style="display:block;width:26px;height:26px;border-radius:9999px;background:#0e7490;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"><svg viewBox="0 0 24 24" width="16" height="16" x="2" y="2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></svg></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -13],
  });
}

/** 現在地マーカー(青ドット) */
function userMarker(): L.DivIcon {
  return L.divIcon({
    className: 'ssn-marker',
    html: `<span style="display:block;position:relative;width:22px;height:22px"><span style="position:absolute;inset:4px;border-radius:9999px;background:#2563eb;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    tooltipAnchor: [0, -11],
  });
}
