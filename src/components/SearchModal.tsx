import React, { useState, useMemo } from 'react';
import { ActiveView } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: ActiveView) => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  targetView: ActiveView;
}

const SEARCH_CATALOG: SearchItem[] = [
  {
    id: 's-1',
    title: 'ESP32 relay trigger spontaneous reboot',
    subtitle: 'Voice note: 14:02 · pin 5 activates, voltage sags',
    category: 'Spoken Moment',
    icon: 'mic',
    targetView: 'timeline',
  },
  {
    id: 's-2',
    title: 'Oscilloscope rail sag to 2.65V',
    subtitle: 'Rigol DS1054Z capture #01 · -650mV brownout drop',
    category: 'Bench Capture',
    icon: 'show_chart',
    targetView: 'troubleshooting',
  },
  {
    id: 's-3',
    title: '1N4007 Rectifier Diode Installation',
    subtitle: 'Flyback antiparallel diode clamping inductive kickback',
    category: 'Hardware Solution',
    icon: 'shield',
    targetView: 'living-map',
  },
  {
    id: 's-4',
    title: 'BME280 Sensor Module (I2C 0x76)',
    subtitle: 'Environmental barometric telemetry on 3.3V bus',
    category: 'Bill of Materials',
    icon: 'inventory_2',
    targetView: 'bom-and-parts',
  },
  {
    id: 's-5',
    title: 'fix(firmware): add 15ms software debounce',
    subtitle: 'Commit c4e12a · Attempted software fix before diode',
    category: 'Git Commit',
    icon: 'code',
    targetView: 'timeline',
  },
  {
    id: 's-6',
    title: 'Mermaid System Architecture (.mmd)',
    subtitle: 'diagrams/system.mmd verified syntax & 1N4007 clamping loop',
    category: 'Diagrams',
    icon: 'account_tree',
    targetView: 'system-diagrams',
  },
  {
    id: 's-7',
    title: 'What is the exact part number of the 5V relay?',
    subtitle: 'GAPS.md open question #01 for BOM.md spec completion',
    category: 'GAPS Question',
    icon: 'help_outline',
    targetView: 'observations',
  },
  {
    id: 's-8',
    title: 'README.md: Complete Documentation publication',
    subtitle: 'Ready for export bundle with 100% sourced citations',
    category: 'Documentation',
    icon: 'description',
    targetView: 'finished-docs',
  },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return SEARCH_CATALOG;
    const q = query.toLowerCase();
    return SEARCH_CATALOG.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1c1b1c] rounded-xl border border-[#353436] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2a2b] bg-[#161618]">
          <span className="material-symbols-outlined text-[#8f9194] text-[20px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search moments, components, git commits, scope captures..."
            className="w-full bg-transparent text-white placeholder-[#8f9194] font-body text-sm focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-[#8f9194] bg-[#201f20] rounded border border-[#353436]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#201f20]/50 p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#8f9194]">
              No evidence logs or components match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.targetView);
                  onClose();
                }}
                className="w-full text-left p-3.5 rounded-lg hover:bg-[#201f20] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[20px] mt-0.5 transition-colors">
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-sm text-white font-medium group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="text-xs text-[#8f9194] mt-0.5">{item.subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#8f9194] bg-[#2a2a2b] px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-[#44474a] group-hover:text-white transition-colors">
                    arrow_forward
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-5 py-3 bg-[#161618] border-t border-[#2a2a2b] flex items-center justify-between text-xs text-[#8f9194]">
          <span>Grounded in 8 hardware session records</span>
          <span className="font-mono">Press ↵ to view</span>
        </div>
      </div>
    </div>
  );
};
