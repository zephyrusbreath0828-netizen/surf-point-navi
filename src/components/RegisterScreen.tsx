import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import exifr from 'exifr';
import { REGIONS, prefsForRegion } from '../lib/regions.ts';
import { haversineKm, fmtKm } from '../lib/distance.ts';
import { SHIKOKU_CENTER } from './MapScreen.tsx';
import { IconCamera } from './icons.tsx';

export interface RegisterInput {
  name: string;
  prefecture: string;
  region: string;
  lat: number;
  lon: number;
  comment: string;
}

type Coord = { lat: number; lon: number };

/** 選択位置マーカー */
function pickIcon(): L.DivIcon {
  return L.divIcon({
    className: 'ssn-marker',
    html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/** 地図タップで緯度経度を取得(GPS未取得時の代替入力) */
function ClickPicker({ onPick }: { onPick: (c: Coord) => void }) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

/** 位置が変わったら地図中心を追従 */
function Recenter({ coord }: { coord: Coord | null }) {
  const map = useMap();
  useEffect(() => {
    if (coord) map.setView([coord.lat, coord.lon], Math.max(map.getZoom(), 13));
  }, [map, coord]);
  return null;
}

export function RegisterScreen({ points, onSave }: {
  points: import('../types.ts').SurfPoint[];
  onSave: (input: RegisterInput) => void;
}) {
  const [photoName, setPhotoName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [gpsFrom, setGpsFrom] = useState<'exif' | 'map' | null>(null);
  const [coord, setCoord] = useState<Coord | null>(null);
  const [busy, setBusy] = useState(false);
  const [gpsWarn, setGpsWarn] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** 選択座標から500m以内の既存ポイント(重複警告) */
  const nearby = useMemo(() => {
    if (!coord) return [];
    return points
      .filter((p) => haversineKm(coord, p) <= 0.5)
      .map((p) => ({ name: p.name, km: haversineKm(coord, p) }))
      .slice(0, 3);
  }, [coord, points]);

  const pickCoord = (c: Coord) => {
    setCoord(c);
    setGpsFrom('map');
    setGpsWarn(false);
  };

  const reset = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl); // 写真は保存せず破棄
    setPhotoUrl(null);
    setPhotoName('');
    setGpsFrom(null);
    setCoord(null);
    setGpsWarn(false);
    setName('');
    setRegion('');
    setPrefecture('');
    setComment('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name);
    setDone(false);
    setBusy(true);
    setGpsWarn(false);
    try {
      // EXIF GPS のみを読み取る(画像データ自体は保存しない)
      const g = await exifr.gps(file);
      if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) {
        setCoord({ lat: g.latitude, lon: g.longitude });
        setGpsFrom('exif');
      } else {
        setGpsFrom(null);
        setGpsWarn(true);
      }
    } catch {
      setGpsFrom(null);
      setGpsWarn(true);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = name.trim() !== '' && region !== '' && prefecture !== '' && coord != null;

  const submit = () => {
    if (!canSubmit || !coord) return;
    onSave({
      name: name.trim().slice(0, 30),
      prefecture,
      region,
      lat: coord.lat,
      lon: coord.lon,
      comment: comment.trim(),
    });
    setDone(true);
    reset();
  };

  const prefs = region ? prefsForRegion(region) : [];
  const center: [number, number] = coord ? [coord.lat, coord.lon] : SHIKOKU_CENTER;

  return (
    <div className="pb-24">
      <header className="bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-700 text-white px-5 pt-6 pb-10 rounded-b-3xl">
        <p className="text-[10px] tracking-[0.25em] text-foam-200/80 font-display font-bold">REGISTER</p>
        <h1 className="text-2xl font-black mt-1">ポイント登録</h1>
        <p className="text-xs text-foam-200/90 mt-2 leading-relaxed">
          写真のEXIFGPS情報から緯度経度を取得します。写真自体は保存されず、位置の取得だけに使います。
        </p>
      </header>

      <main className="px-4 -mt-6 relative space-y-4 pb-4">
        {done && (
          <section className="bg-white rounded-2xl border border-lagoon-500/40 p-4 text-sm font-bold text-lagoon-600">
            登録しました。ホーム・地図・ランキングに反映されています。
          </section>
        )}

        {/* 1. 写真選択 */}
        <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-sm text-ocean-950">1. 写真を選択</h2>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            id="photo-input"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <label
            htmlFor="photo-input"
            className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-sand-300 rounded-xl py-5 text-sm font-bold text-ocean-800 cursor-pointer active:bg-sand-50"
          >
            <IconCamera className="w-5 h-5" />
            {photoName ? '写真を変更する' : '写真を選択(カメラ撮影でもOK)'}
          </label>
          {photoUrl && (
            <div className="flex items-center gap-3">
              <img src={photoUrl} alt="選択した写真" className="w-16 h-16 rounded-xl object-cover border border-sand-300" />
              <p className="text-[11px] text-neutral-400 truncate flex-1">
                {photoName}
                <span className="block">登録時に写真は破棄されます(保存されません)</span>
              </p>
            </div>
          )}
          {busy && <p className="text-xs text-neutral-500">EXIFを読み込み中…</p>}
          {gpsWarn && (
            <p className="text-xs font-bold text-coral-500 bg-coral-500/10 rounded-xl px-3 py-2.5 leading-relaxed">
              GPS情報が見つかりません。<br />地図上から場所を選択してください。
            </p>
          )}
          {gpsFrom === 'exif' && coord && (
            <p className="text-xs font-bold text-lagoon-600 bg-lagoon-500/10 rounded-xl px-3 py-2.5">
              写真のEXIFから位置を取得しました
            </p>
          )}
          {gpsFrom === 'map' && coord && (
            <p className="text-xs text-neutral-500 px-1">
              地図で選択した位置: {coord.lat.toFixed(5)}, {coord.lon.toFixed(5)}
            </p>
          )}
        </section>

        {/* 2. 地図確認(GPS取得 or タップ選択) */}
        <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-sm text-ocean-950">
            2. 位置の確認
            <span className="ml-2 text-[11px] font-normal text-neutral-400">地図をタップして位置を指定・修正できます</span>
          </h2>
          <div className="h-52 rounded-xl overflow-hidden border border-sand-300">
            <MapContainer center={center} zoom={coord ? 14 : 8} zoomControl={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickPicker onPick={pickCoord} />
              <Recenter coord={coord} />
              {coord && <Marker position={[coord.lat, coord.lon]} icon={pickIcon()} />}
            </MapContainer>
          </div>
          {coord == null && (
            <p className="text-[11px] text-neutral-400">位置が未選択です。写真からGPSを取るか、地図をタップしてください。</p>
          )}
          {nearby.length > 0 && (
            <p className="text-[11px] font-bold text-coral-500 bg-coral-500/10 rounded-xl px-3 py-2.5 leading-relaxed">
              ⚠ 既存ポイントの可能性があります: {nearby.map((n) => `${n.name}(${fmtKm(n.km)})`).join('・')}
              <span className="block font-normal text-neutral-500">このまま登録することも可能です。</span>
            </p>
          )}
        </section>

        {/* 3. ポイント情報入力 */}
        <section className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-sm text-ocean-950">3. ポイント情報</h2>
          <label className="block">
            <span className="block text-[10px] font-bold text-neutral-400 mb-0.5">ポイント名(必須)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 〇〇海岸"
              maxLength={30}
              className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-ocean-950 focus:outline-none focus:ring-2 focus:ring-ocean-700/30"
            />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="block text-[10px] font-bold text-neutral-400 mb-0.5">地方区分</span>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setPrefecture('');
                }}
                className="w-full bg-white border border-sand-300 rounded-xl px-2.5 py-2 text-sm text-ocean-950 appearance-none"
              >
                <option value="">選択してください</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] font-bold text-neutral-400 mb-0.5">都道府県</span>
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                disabled={!region}
                className="w-full bg-white border border-sand-300 rounded-xl px-2.5 py-2 text-sm text-ocean-950 appearance-none disabled:bg-sand-50"
              >
                <option value="">選択してください</option>
                {prefs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="block text-[10px] font-bold text-neutral-400 mb-0.5">コメント(任意)</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="メモ(潮回り・駐車場所など)"
              className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-ocean-950 focus:outline-none focus:ring-2 focus:ring-ocean-700/30"
            />
          </label>
          <p className="text-[11px] text-neutral-400">
            自動取得: 緯度 {coord ? coord.lat.toFixed(5) : '—'} / 経度 {coord ? coord.lon.toFixed(5) : '—'}(Open-Meteo評価対象になります)
          </p>
        </section>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`w-full rounded-2xl py-3.5 text-sm font-bold shadow-sm ${
            canSubmit ? 'bg-ocean-900 text-white active:scale-[0.99]' : 'bg-sand-100 text-neutral-400'
          }`}
        >
          この位置でポイントを登録
        </button>

        <p className="text-[10px] text-neutral-400 leading-relaxed px-1">
          登録したポイントはこのブラウザ内(localStorage)にのみ保存されます。写真はEXIF読取後ただちに破棄され、どこにも保存されません。
        </p>
      </main>
    </div>
  );
}
