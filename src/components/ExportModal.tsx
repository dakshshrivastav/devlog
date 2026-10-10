import type { Artifact } from '../../shared/schema';

export function ExportModal({
  isOpen,
  onClose,
  sessionId,
  openGapsCount,
  artifacts,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  openGapsCount: number;
  artifacts: Artifact[];
}) {
  if (!isOpen) return null;
  const bundleUrl = `/api/sessions/${encodeURIComponent(sessionId)}/bundle`;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-surface-1 px-5 py-4"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-white">download</span><h2 className="font-headline text-lg font-light text-white">Export documentation bundle</h2></div><button onClick={onClose} className="text-muted hover:text-white"><span className="material-symbols-outlined">close</span></button></div>
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface-3 p-4"><div><div className="text-sm text-white">Bundle ready</div><div className="mt-1 text-xs text-muted">{artifacts.length} generated artifacts · local session data</div></div><span className="rounded bg-surface-2 px-2.5 py-1 font-mono text-[10px] text-body">{artifacts.reduce((n, a) => n + (a.bytes ?? 0), 0).toLocaleString()} bytes</span></div>
          {openGapsCount > 0 && <div className="flex gap-2 rounded-lg border border-alert/25 bg-alert-deep/15 p-3 text-xs leading-relaxed text-alert"><span className="material-symbols-outlined text-base">info</span><span>{openGapsCount} open gap {openGapsCount === 1 ? 'question remains' : 'questions remain'}. You can export now; unanswered facts remain listed in GAPS.md.</span></div>}
          <div><div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Included deliverables</div><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{artifacts.map((artifact) => <div key={artifact.id} className="flex min-w-0 items-center gap-2 rounded bg-surface-0 px-3 py-2"><span className="material-symbols-outlined text-sm text-muted">{artifact.kind === 'mermaid' ? 'schema' : 'article'}</span><span className="truncate font-mono text-[10px] text-body">{artifact.name}</span></div>)}</div></div>
          <a href={bundleUrl} onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-surface-0 transition-colors hover:bg-ink-hover"><span className="material-symbols-outlined text-lg">folder_zip</span>Download documentation bundle (.zip)</a>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-surface-1 px-5 py-3 text-[10px] text-muted"><span>Generated files are stored locally</span><span className="font-mono">ZIP · Markdown · Mermaid</span></div>
      </div>
    </div>
  );
}
