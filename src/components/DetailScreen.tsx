import type { PointData, SurfPoint } from '../types.ts';
import { evaluatePoint, currentForecast, bestHourIdx } from '../lib/score.ts';
import { WIND_TAG_LABEL, bottomLabel, dir16, fmtHM, levelLabel, offshoreDir, sizeLabel, sizeRangeLabel } from '../lib/format.ts';
import { fmtKm } from '../lib/distance.ts';
import { StarRating } from './StarRating.tsx';
import { ScoreRing } from './ScoreRing.tsx';
import { HourlyChart } from './HourlyChart.tsx';
import { IconBack, IconCompass, IconClock, IconTemp, IconWave, IconWind } from './icons.tsx';
import type { ReactNode } from 'react';

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

export function DetailScreen({ point, pd, dist, onBack, onEdit }: {
  point: SurfPoint;
  pd: PointData | undefined;
  dist?: number | null;
  onBack: () => void;
  onEdit: () => void;
}) {
  const f = pd ? currentForecast(pd) : null;
  const ev = f ? evaluatePoint(point, f) : null;
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
