import { useEffect, useState } from 'react';
import type { SearchResult } from '../../shared/schema';
import { api } from '../lib/api';

export function SearchModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const text = query.trim();
    if (!text) { setResults([]); setSelected(0); setLoading(false); setError(null); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void api.search(text, undefined, controller.signal).then((response) => {
        setResults(response.results);
        setSelected(0);
      }).catch((cause) => {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(cause instanceof Error ? cause.message : 'Search is temporarily unavailable.');
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [isOpen, query, retryKey]);

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;
  const choose = (item: SearchResult) => { onSelect(item); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="h-fit w-full max-w-2xl overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl">
         <div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="material-symbols-outlined text-muted">search</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((n) => results.length ? Math.min(n + 1, results.length - 1) : 0); } if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((n) => Math.max(n - 1, 0)); } if (e.key === 'Enter' && results[selected]) choose(results[selected]); }} placeholder="Search evidence, components, ideas, gaps…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted" /><kbd className="rounded border border-line bg-surface-0 px-1.5 py-1 font-mono text-[10px] text-muted">ESC</kbd></div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? <div className="p-6 text-center text-xs text-muted">Searching saved sessions…</div> : error ? <div className="p-6 text-center"><p className="text-xs text-alert">{error}</p><button onClick={() => setRetryKey((key) => key + 1)} className="mt-3 text-xs text-white underline underline-offset-4">Try again</button></div> : query.trim() && !results.length ? <div className="p-6 text-center text-xs text-muted">No matching evidence or artifacts.</div> : !query.trim() ? <div className="p-6 text-center text-xs text-muted">Search evidence, ideas, components and generated docs across your local sessions.</div> : results.map((item, index) => <button key={item.id} onMouseEnter={() => setSelected(index)} onClick={() => choose(item)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left ${selected === index ? 'bg-surface-3' : 'hover:bg-surface-3/60'}`}><span className="material-symbols-outlined text-[18px] text-muted">{item.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-white">{item.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{item.subtitle ?? item.category}</span></span><span className="shrink-0 font-mono text-[10px] text-muted">{item.category}</span></button>)}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-surface-1 px-4 py-2 text-[10px] text-muted"><span>{results.length} result{results.length === 1 ? '' : 's'}</span><span>↑↓ Navigate · ↵ Open</span></div>
      </div>
    </div>
  );
}
