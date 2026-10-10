import React from 'react';
import { ActiveView } from '../types';

interface HeaderProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  sessionTime: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenSearch: () => void;
  onOpenExport: () => void;
}

const NAV_ITEMS: { id: ActiveView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'living-map', label: 'Living Map' },
  { id: 'live-flowchart', label: 'Live Flowchart' },
  { id: 'observations', label: 'Observations' },
  { id: 'system-diagrams', label: 'System Diagrams' },
  { id: 'bom-and-parts', label: 'BOM & Parts' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'finished-docs', label: 'Finished Docs' },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  sessionTime,
  isPaused,
  onTogglePause,
  onOpenSearch,
  onOpenExport,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#131314]/90 backdrop-blur-xl border-b border-[#2a2a2b]/60">
      <div className="h-16 w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
        {/* Left Brand & Session status */}
        <div className="flex items-center gap-3.5 shrink-0">
          <button
            onClick={() => onSelectView('overview')}
            className="font-headline text-xl text-white tracking-tight font-light hover:opacity-85 transition-opacity"
          >
            devlog
          </button>
          <span className="text-[#44474a] font-light select-none">/</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPaused ? 'bg-[#c5c7c9]' : 'bg-[#e5e2e3] animate-pulse'
              }`}
            />
            <span className="text-xs text-[#c5c7c9] font-normal tracking-wide flex items-center gap-1.5">
              <span>{isPaused ? 'Paused' : 'Active Session'}</span>
              <span className="text-[#8f9194]">·</span>
              <span className="font-mono text-white">{sessionTime}</span>
              <span className="text-[#8f9194] hidden sm:inline">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[#8f9194]">
                <span className="material-symbols-outlined text-[13px] text-white">mic</span>
                <span>Mic active</span>
              </span>
            </span>
          </div>
        </div>

        {/* Central Typographic Pivot Navigation */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7 overflow-x-auto h-full scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`transition-colors py-5 text-xs xl:text-sm whitespace-nowrap border-b-2 font-headline tracking-tight ${
                  isActive
                    ? 'text-white font-medium border-white'
                    : 'text-[#8f9194] hover:text-white font-light border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-[#c5c7c9] hover:text-white text-xs transition-colors border border-[#353436]/40"
            title={isPaused ? 'Resume Session' : 'Pause Session'}
          >
            <span className="material-symbols-outlined text-[15px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
            <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-[#c5c7c9] hover:text-white text-xs transition-colors border border-[#353436]/40"
            title="Search moments, logs, components"
          >
            <span className="material-symbols-outlined text-[15px]">search</span>
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-[#c5c7c9] hover:text-white text-xs transition-colors border border-[#353436]/40"
            title="Export files & documentation"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span className="hidden sm:inline">Export</span>
          </button>

          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center shrink-0 ml-1 text-[#131314] cursor-pointer shadow-sm hover:opacity-90"
            title="Active Hardware Engineer: Daksh Shrivastav"
          >
            <span className="material-symbols-outlined text-[17px]">person</span>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Pivot Bar */}
      <div className="lg:hidden flex items-center gap-4 px-4 overflow-x-auto border-t border-[#2a2a2b]/40 py-2 scrollbar-none bg-[#161618]">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`text-xs whitespace-nowrap font-headline tracking-tight ${
                isActive ? 'text-white font-medium' : 'text-[#8f9194] font-light'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
