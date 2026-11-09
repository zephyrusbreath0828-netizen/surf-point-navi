import { useState } from 'react';
import type { Bottom, Level, SurfPoint } from '../types.ts';
import { DIRS16, bottomLabel, dir16, levelLabel, sizeLabel } from '../lib/format.ts';
import { genId } from '../lib/storage.ts';

const inputCls =
  'w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2.5 text-base text-ocean-950 focus:outline-none focus:ring-2 focus:ring-lagoon-500';

export function PointForm({ initial, onSave, onDelete, onClose }: {
  initial: SurfPoint | 'new';
  onSave: (p: SurfPoint) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isNew = initial === 'new';
  const [name, setName] = useState(isNew ? '' : initial.name);
  const [lat, setLat] = useState(isNew ? '' : String(initial.lat));
  const [lng, setLng] = useState(isNew ? '' : String(initial.lng));
  const [bearing, setBearing] = useState(isNew ? 180 : initial.bearing);
  const [sizeMin, setSizeMin] = useState(isNew ? 0.6 : initial.sizeMin);
  const [sizeMax, setSizeMax] = useState(isNew ? 1.4 : initial.sizeMax);
  const [level, setLevel] = useState<Level>(isNew ? 'beginner' : initial.level);
  const [bottom, setBottom] = useState<Bottom>(isNew ? 'sand' : initial.bottom);
  const [err, setErr] = useState<string | null>(null);

  const offDir = (bearing + 180) % 360;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const mapOk = Number.isFinite(latNum) && Number.isFinite(lngNum);

  const save = () => {
    if (!name.trim()) return setErr('ポイント名を入力してください');
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) return setErr('緯度が不正です(例: 33.5283)');
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) return setErr('経度が不正です(例: 134.2820)');
    if (sizeMin >= sizeMax) return setErr('なじみサイズの下限は上限より小さくしてください');
    onSave({
      id: isNew ? genId() : (initial as SurfPoint).id,
      name: name.trim(),
      lat: latNum,
      lng: lngNum,
      bearing,
      sizeMin,
      sizeMax,
      level,
      bottom,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ocean-950/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl max-h-[92dvh] overflow-y-auto p-5 pb-safe"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isNew ? 'ポイントを追加' : 'ポイントを編集'}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-ocean-950">{isNew ? 'ポイントを追加' : 'ポイントを編集'}</h2>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2 py-1">
            閉じる
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">名称</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 生見海岸" />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">緯度・経度</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="緯度 33.5283"
              />
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="経度 134.2820"
              />
            </div>
            {mapOk && (
              <a
                className="inline-block mt-1.5 text-[11px] text-lagoon-600 underline"
                href={`https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lngNum}#map=14/${latNum}/${lngNum}`}
                target="_blank"
                rel="noreferrer"
              >
                地図で位置を確認する
              </a>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">ポイントの向き(海側)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DIRS16.map((d, i) => {
                const deg = i * 22.5;
                const sel = deg === bearing;
                return (
                  <button
                    key={d}
                    onClick={() => setBearing(deg)}
                    className={`text-xs py-2 rounded-lg border transition-colors ${
                      sel ? 'bg-ocean-900 text-white border-ocean-900 font-bold' : 'bg-white text-ocean-800 border-sand-300'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed">
              うねりは{dir16(bearing)}から入るとまっすぐ入り、{dir16(offDir)}風がオフショアになります。
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">なじみサイズ(良い波になる波高)</label>
            <div className="text-[11px] text-neutral-500 mb-1">
              下限 {sizeMin.toFixed(1)}m({sizeLabel(sizeMin)})〜 上限 {sizeMax.toFixed(1)}m({sizeLabel(sizeMax)})
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={sizeMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSizeMin(v);
                if (v > sizeMax - 0.1) setSizeMax(Math.min(3, v + 0.1));
              }}
              className="w-full accent-lagoon-600"
              aria-label="なじみサイズの下限"
            />
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.1"
              value={sizeMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSizeMax(v);
                if (v < sizeMin + 0.1) setSizeMin(Math.max(0.2, v - 0.1));
              }}
              className="w-full accent-ocean-800"
              aria-label="なじみサイズの上限"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-500 mb-1 block">レベル帯</label>
              <div className="flex rounded-xl overflow-hidden border border-sand-300">
                {(['beginner', 'intermediate'] as Level[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`flex-1 text-xs py-2 ${level === l ? 'bg-ocean-900 text-white font-bold' : 'bg-white text-neutral-500'}`}
                  >
                    {levelLabel(l)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 mb-1 block">底質</label>
              <div className="flex rounded-xl overflow-hidden border border-sand-300">
                {(['sand', 'mix', 'reef'] as Bottom[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBottom(b)}
                    className={`flex-1 text-xs py-2 ${bottom === b ? 'bg-ocean-900 text-white font-bold' : 'bg-white text-neutral-500'}`}
                  >
                    {bottomLabel(b)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {err && <p className="text-xs text-coral-500 font-bold">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 bg-ocean-900 text-white rounded-xl py-3 font-bold text-sm active:opacity-80">
              保存する
            </button>
            {!isNew && onDelete && (
              <button
                onClick={() => {
                  if (window.confirm(`「${name}」を削除しますか?`)) onDelete((initial as SurfPoint).id);
                }}
                className="px-4 rounded-xl border border-coral-500/40 text-coral-500 font-bold text-sm"
              >
                削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
