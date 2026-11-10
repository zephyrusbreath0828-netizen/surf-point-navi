import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Ranked, UserLocation } from '../types.ts';
import { fmtKm } from '../lib/distance.ts';
import { IconLocate } from './icons.tsx';

/** 現在地取得に失敗したときの初期表示中心(四国のほぼ中央) */
export const SHIKOKU_CENTER: [number, number] = [33.6, 133.55];

/** 評価点に応じたマーカー色: 90+緑 / 70-89青 / 50-69黄 / 49-赤 */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return '#9ca3af';
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#2563eb';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function pointIcon(score: number | null): L.DivIcon {
  const c = scoreColor(score);
  const s = 20;
  return L.divIcon({
    className: 'ssn-marker',
    html: `<span style="display:block;width:${s}px;height:${s}px;border-radius:9999px;background:${c};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    tooltipAnchor: [0, -s / 2],
  });
}

function userIcon(): L.DivIcon {
  return L.divIcon({
    className: 'ssn-marker',
    html: `<span style="display:block;position:relative;width:22px;height:22px">
      <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,.35);animation:ssn-pulse 1.8s ease-out infinite"></span>
      <span style="position:absolute;inset:4px;border-radius:9999px;background:#2563eb;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span>
    </span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    tooltipAnchor: [0, -11],
  });
}

/** 全ポイント(+現在地)が収まるように表示範囲を調整 */
function Fit({ ranked, location }: { ranked: Ranked[]; location: UserLocation | null }) {
  const map = useMap();
  useEffect(() => {
    const pts: L.LatLngTuple[] = ranked.map((r) => [r.point.lat, r.point.lon]);
    if (location) pts.push([location.lat, location.lon]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], location ? 12 : 10);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [36, 90] });
  }, [map, ranked, location]);
  return null;
}

function Banner({ children }: { children: string }) {
  return (
    <div className="inline-block bg-ocean-950/85 text-white text-xs font-bold rounded-full px-3 py-1.5 backdrop-blur">
      {children}
    </div>
  );
}

export function MapScreen({ ranked, location, geoStatus, onLocate, onOpen }: {
  ranked: Ranked[];
  location: UserLocation | null;
  geoStatus: 'idle' | 'loading' | 'ok' | 'error';
  onLocate: () => void;
  onOpen: (id: string) => void;
}) {
  const [map, setMap] = useState<L.Map | null>(null);
  const center: L.LatLngTuple = location ? [location.lat, location.lon] : SHIKOKU_CENTER;

  return (
    <div className="relative z-0 h-dvh w-full overflow-hidden bg-[#dfe7ec]">
      <MapContainer center={center} zoom={9} zoomControl={false} ref={setMap} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit ranked={ranked} location={location} />

        {location && (
          <>
            <Circle
              center={[location.lat, location.lon]}
              radius={Math.max(50, Math.min(location.accuracy || 100, 2000))}
              pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.08 }}
            />
            <Marker position={[location.lat, location.lon]} icon={userIcon()}>
              <Tooltip direction="top" offset={[0, -14]}>
                現在地
              </Tooltip>
            </Marker>
          </>
        )}

        {ranked.map((r) => (
          <Marker
            key={r.point.id}
            position={[r.point.lat, r.point.lon]}
            icon={pointIcon(r.ev?.score ?? null)}
            eventHandlers={{ click: () => onOpen(r.point.id) }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              {r.point.name}・{r.ev ? `${r.ev.score}点` : '評価 —'}
              {r.dist != null ? `・${fmtKm(r.dist)}` : ''}
              {r.ev?.tideNote ? `・潮: ${r.ev.tideNote}` : ''}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* 上部: ステータス+色の凡例 */}
      <div className="absolute left-3 right-3 top-3 z-[1000] pointer-events-none flex flex-col items-start gap-1.5">
        {geoStatus === 'loading' && <Banner>現在地を取得中…</Banner>}
        {geoStatus === 'error' && <Banner>現在地を取得できませんでした・四国中央を表示中</Banner>}
        <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 text-[10px] font-bold text-ocean-950 shadow-sm">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            90+
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
            70〜89
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#eab308]" />
            50〜69
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
            〜49
          </span>
        </div>
      </div>

      {/* 下部: ポイント chips(タップで詳細) */}
      <div className="absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] z-[1000] px-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {ranked.map((r) => (
            <button
              key={r.point.id}
              onClick={() => onOpen(r.point.id)}
              className="shrink-0 bg-white/95 backdrop-blur rounded-full shadow px-3 py-1.5 text-xs font-bold text-ocean-950 flex items-center gap-1.5 active:bg-sand-100"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: scoreColor(r.ev?.score ?? null) }} />
              {r.point.name}
              {r.dist != null && <span className="text-neutral-400 font-normal">{fmtKm(r.dist)}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 現在地ボタン */}
      <button
        onClick={() => {
          onLocate();
          if (location && map) map.flyTo([location.lat, location.lon], Math.max(map.getZoom(), 12), { duration: 0.6 });
        }}
        aria-label="現在地を取得して移動"
        className="absolute right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+124px)] z-[1000] w-12 h-12 rounded-full bg-white shadow-lg border border-sand-300 flex items-center justify-center text-ocean-800 active:bg-sand-100"
      >
        <IconLocate className="w-5 h-5" />
      </button>
    </div>
  );
}
