import { useEffect, useState } from 'react';
import type { SurfPoint } from '../types.ts';
import { loadAllPoints, packLabel } from '../lib/loadPoints.ts';
import { bottomLabel, letterJP, levelLabel, sizeRangeLabel } from '../lib/format.ts';
import { PointForm } from './PointForm.tsx';
import { IconPlus, IconTrash } from './icons.tsx';
import { APP_VERSION } from '../lib/version.ts';

export function ManageScreen({ points, onSaveAll, initialEdit }: {
  points: SurfPoint[];
  onSaveAll: (pts: SurfPoint[]) => void;
  initialEdit?: string;
}) {
  const [editing, setEditing] = useState<SurfPoint | 'new' | null>(null);

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
    onSaveAll(points.filter((x) => x.id !== id));
    setEditing(null);
  };

  const reset = () => {
    if (window.confirm('全ポイントをパックJSONの初期状態に戻します。よろしいですか?')) {
      onSaveAll(loadAllPoints());
    }
  };

  return (
    <div className="pb-24">
      <header className="bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-700 text-white px-5 pt-6 pb-10 rounded-b-3xl">
        <p className="text-[10px] tracking-[0.25em] text-foam-200/80 font-display font-bold">MY POINTS</p>
        <h1 className="text-2xl font-black mt-1">ポイント管理</h1>
        <p className="text-xs text-foam-200/90 mt-2 leading-relaxed">
          良い風向・うねり方角・なじみサイズを設定すると、スコアと評価コメントが変わります。
        </p>
      </header>

      <main className="px-4 -mt-6 space-y-2.5 relative pb-4">
        {points.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-sand-300/60 shadow-sm p-4 flex items-center gap-2">
            <button className="flex-1 min-w-0 text-left" onClick={() => setEditing(p)}>
              <div className="font-bold text-ocean-950 truncate">
                {p.name}
                <span className="ml-2 text-[10px] font-normal text-neutral-400">{packLabel(p.region)}</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                {[p.prefecture, `良い風 ${p.goodWind.length ? p.goodWind.map(letterJP).join('/') : '—'}`, `なじみ ${sizeRangeLabel(p.waveMin, p.waveMax)}`, levelLabel(p.level), bottomLabel(p.bottom)]
                  .filter(Boolean)
                  .join('・')}
              </div>
            </button>
            <button
              aria-label={`${p.name}を削除`}
              onClick={() => {
                if (window.confirm(`「${p.name}」を削除しますか?`)) remove(p.id);
              }}
              className="text-neutral-300 hover:text-coral-500 p-2 shrink-0"
            >
              <IconTrash className="w-5 h-5" />
            </button>
          </div>
        ))}

        <button
          onClick={() => setEditing('new')}
          className="w-full rounded-2xl border-2 border-dashed border-sand-300 py-3.5 text-ocean-700 font-bold text-sm flex items-center justify-center gap-1.5 active:bg-sand-50"
        >
          <IconPlus className="w-4 h-4" />
          ポイントを追加
        </button>

        <div className="pt-1">
          <button onClick={reset} className="text-xs text-neutral-400 underline">
            パックJSONの初期データに戻す
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          緯度・経度は海岸付近の値を入れてください(予報は0.05°グリッドの海洋モデルから取得します)。設定はこのブラウザ内にのみ保存されます。

        <p className="text-[11px] text-neutral-400 pt-2">
          surf-point-navi v{APP_VERSION}
        </p>
        </p>
      </main>

      {editing && (
        <PointForm initial={editing} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
