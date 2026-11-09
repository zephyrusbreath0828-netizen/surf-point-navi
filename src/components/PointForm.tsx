import { useState } from 'react';
import type { Bottom, DirLetter, Level, SurfPoint } from '../types.ts';
import { DIRS16, LETTERS16, bottomLabel, levelLabel, sizeLabel } from '../lib/format.ts';
import { genId } from '../lib/normalize.ts';

const inputCls =
  'w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2.5 text-base text-ocean-950 focus:outline-none focus:ring-2 focus:ring-lagoon-500';

/** 16方位の複数選択チップ */
function DirPicker({ value, onChange }: { value: DirLetter[]; onChange: (v: DirLetter[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {LETTERS16.map((l, i) => {
        const sel = value.includes(l);
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(sel ? value.filter((x) => x !== l) : [...value, l])}
            className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
              sel ? 'bg-ocean-900 text-white border-ocean-900' : 'bg-white text-ocean-800 border-sand-300'
            }`}
          >
            {DIRS16[i]}
            <span className="ml-1 font-normal opacity-50">{l}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PointForm({ initial, onSave, onDelete, onClose }: {
  initial: SurfPoint | 'new';
  onSave: (p: SurfPoint) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isNew = initial === 'new';
  const [name, setName] = useState(isNew ? '' : initial.name);
  const [prefecture, setPrefecture] = useState(isNew ? '' : initial.prefecture);
  const [lat, setLat] = useState(isNew ? '' : String(initial.lat));
  const [lon, setLon] = useState(isNew ? '' : String(initial.lon));
  const [goodWind, setGoodWind] = useState<DirLetter[]>(isNew ? [] : initial.goodWind);
  const [badWind, setBadWind] = useState<DirLetter[]>(isNew ? [] : initial.badWind);
  const [goodSwell, setGoodSwell] = useState<DirLetter[]>(isNew ? [] : initial.goodSwell);
  const [waveMin, setWaveMin] = useState(isNew ? 0.6 : initial.waveMin);
  const [waveMax, setWaveMax] = useState(isNew ? 1.4 : initial.waveMax);
  const [level, setLevel] = useState<Level>(isNew ? 'beginner' : initial.level);
  const [bottom, setBottom] = useState<Bottom>(isNew ? 'sand' : initial.bottom);
  const [err, setErr] = useState<string | null>(null);

  const latNum = Number(lat);
  const lonNum = Number(lon);
  const mapOk = Number.isFinite(latNum) && Number.isFinite(lonNum);

  const save = () => {
    if (!name.trim()) return setErr('ポイント名を入力してください');
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) return setErr('緯度が不正です(例: 33.525)');
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) return setErr('経度が不正です(例: 134.288)');
    if (waveMin >= waveMax) return setErr('なじみサイズの下限は上限より小さくしてください');
    onSave({
      id: isNew ? genId() : (initial as SurfPoint).id,
      name: name.trim(),
      prefecture: prefecture.trim(),
      region: isNew ? 'custom' : (initial as SurfPoint).region,
      lat: latNum,
      lon: lonNum,
      goodWind,
      badWind,
      goodSwell,
      waveMin,
      waveMax,
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
            <label className="text-xs font-bold text-neutral-500 mb-1 block">都道府県</label>
            <input className={inputCls} value={prefecture} onChange={(e) => setPrefecture(e.target.value)} placeholder="例: 高知県" />
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
                placeholder="緯度 33.525"
              />
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="経度 134.288"
              />
            </div>
            {mapOk && (
              <a
                className="inline-block mt-1.5 text-[11px] text-lagoon-600 underline"
                href={`https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lonNum}#map=14/${latNum}/${lonNum}`}
                target="_blank"
                rel="noreferrer"
              >
                地図で位置を確認する
              </a>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">良い風向(複数選択可)</label>
            <DirPicker value={goodWind} onChange={setGoodWind} />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">悪い風向(複数選択可)</label>
            <DirPicker value={badWind} onChange={setBadWind} />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">良いうねり方向(複数選択可)</label>
            <DirPicker value={goodSwell} onChange={setGoodSwell} />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 mb-1 block">なじみサイズ(良い波になる波高)</label>
            <div className="text-[11px] text-neutral-500 mb-1">
              下限 {waveMin.toFixed(1)}m({sizeLabel(waveMin)})〜 上限 {waveMax.toFixed(1)}m({sizeLabel(waveMax)})
            </div>
            <input
              type="range"
              min="0.2"
              max="4"
              step="0.1"
              value={waveMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setWaveMin(v);
                if (v > waveMax - 0.1) setWaveMax(Math.min(4, v + 0.1));
              }}
              className="w-full accent-lagoon-600"
              aria-label="なじみサイズの下限"
            />
            <input
              type="range"
              min="0.3"
              max="4"
              step="0.1"
              value={waveMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setWaveMax(v);
                if (v < waveMin + 0.1) setWaveMin(Math.max(0.2, v - 0.1));
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
                    type="button"
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
                    type="button"
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
