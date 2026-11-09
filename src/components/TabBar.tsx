import type { ReactNode } from 'react';
import { IconGear, IconHome, IconMap } from './icons.tsx';

type Tab = 'home' | 'map' | 'manage';

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const item = (key: Tab, label: string, icon: ReactNode) => (
    <button
      onClick={() => onTab(key)}
      className={`flex flex-col items-center gap-0.5 pt-2 text-[10px] font-bold ${tab === key ? 'text-ocean-900' : 'text-neutral-400'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-sand-300/80">
      <div className="max-w-md mx-auto grid grid-cols-3 pb-safe">
        {item('home', 'ホーム', <IconHome className="w-5 h-5" />)}
        {item('map', '地図', <IconMap className="w-5 h-5" />)}
        {item('manage', 'ポイント管理', <IconGear className="w-5 h-5" />)}
      </div>
    </nav>
  );
}
