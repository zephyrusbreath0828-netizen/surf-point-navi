import type { ReactNode } from 'react';
import { IconGear, IconHome, IconMap } from './icons.tsx';

type Tab = 'home' | 'map' | 'register' | 'manage';

function IconCameraTab({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

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
      <div className="max-w-md mx-auto grid grid-cols-4 pb-safe">
        {item('home', 'ホーム', <IconHome className="w-5 h-5" />)}
        {item('map', '地図', <IconMap className="w-5 h-5" />)}
        {item('register', '登録', <IconCameraTab className="w-5 h-5" />)}
        {item('manage', '管理', <IconGear className="w-5 h-5" />)}
      </div>
    </nav>
  );
}
