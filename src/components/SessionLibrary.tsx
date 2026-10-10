import { useState } from 'react';
import type { Session } from '../../shared/schema';
import { formatClock, formatDuration, formatPercent } from '../../shared/format';

export function SessionLibrary({
  sessions,
  loading,
  error,
  onOpen,
  onCreate,
}: {
  sessions: Session[];
  loading: boolean;
  error?: string;
  onOpen: (session: Session) => void;
  onCreate: (name: string, mode: 'batch' | 'live') => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'batch' | 'live'>('batch');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate(name.trim(), mode);
      setCreating(false);
      setName('');
      setCreateError(null);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Could not create the session.');
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1440px] px-4 pb-14 pt-12 sm:px-6 lg:px-12">
      <header className="mb-10 flex flex-col justify-between gap-5 border-b border-line/50 pb-7 sm:flex-row sm:items-end">
        <div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-white" /> Local session library</div><h1 className="font-headline text-4xl font-light tracking-tight text-white sm:text-6xl">devlog</h1><p className="mt-3 max-w-[65ch] text-sm font-light leading-relaxed text-body">A living record of hardware work. Each session keeps its evidence, reasoning graph, hardware fact sheet, unresolved questions and generated docs together.</p></div>
        <button onClick={() => { setCreateError(null); setCreating(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-surface-0 transition-colors hover:bg-ink-hover"><span className="material-symbols-outlined text-lg">add</span>New session</button>
      </header>
      {error && <div className="mb-5 rounded-lg border border-alert/30 bg-alert-deep/15 p-4 text-sm text-alert">{error}</div>}
      <div className="mb-5 flex items-center justify-between"><div className="font-headline text-xl font-light text-white">Sessions</div><div className="font-mono text-xs text-muted">{sessions.length} on this device</div></div>
      {loading ? <div className="py-16 text-center text-sm text-muted">Loading local sessions…</div> : sessions.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{sessions.map((session) => <button key={session.id} onClick={() => onOpen(session)} className="group rounded-xl border border-line bg-surface-2 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-3"><div className="mb-5 flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-0 text-white"><span className="material-symbols-outlined">{session.mode === 'live' ? 'graphic_eq' : 'memory'}</span></span><span className="flex gap-1.5"><span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase ${session.status === 'ready' ? 'border-line-strong/50 text-body' : 'border-white/20 text-white'}`}>{session.status}</span>{session.mock && <span className="rounded-full border border-line/60 px-2 py-1 font-mono text-[9px] text-muted">MOCK</span>}</span></div><h2 className="font-headline text-lg font-normal text-white">{session.name}</h2><p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">{session.mode} capture · {formatClock(session.createdAt)}</p><div className="mt-5 grid grid-cols-3 gap-2 border-t border-line/60 pt-4"><Metric label="Evidence" value={String(session.counts.evidence)} /><Metric label="Grounded" value={formatPercent(session.grounding.percent)} /><Metric label="Duration" value={formatDuration(session.durationSec)} /></div><div className="mt-4 flex items-center justify-between text-xs text-muted"><span>{session.repoBranch ? `Branch ${session.repoBranch}` : 'No repository linked'}</span><span className="flex items-center gap-1 transition-colors group-hover:text-white">Open <span className="material-symbols-outlined text-sm">arrow_forward</span></span></div></button>)}</div> : <div className="rounded-xl border border-dashed border-line-strong/60 px-6 py-16 text-center"><span className="material-symbols-outlined text-3xl text-muted">inventory_2</span><h2 className="mt-3 font-headline text-lg text-white">No sessions yet</h2><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Start a recorded session, or open the included fixture to explore a completed build log and its generated artifacts.</p><button onClick={() => setCreating(true)} className="mt-5 rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-surface-0">Create a session</button></div>}

      {creating && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreating(false); }}><form onSubmit={(e) => void submit(e)} className="w-full max-w-lg rounded-xl border border-line-strong bg-surface-2 shadow-2xl"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div className="font-headline text-lg text-white">New build session</div><button type="button" onClick={() => setCreating(false)} className="text-muted hover:text-white"><span className="material-symbols-outlined">close</span></button></div><div className="space-y-5 p-5"><label className="block"><span className="mb-2 block text-xs text-body">Project or session name</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Relay controller bring-up" className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-line-strong" /></label><div><div className="mb-2 text-xs text-body">Capture mode</div><div className="grid grid-cols-2 gap-2"><ModeButton selected={mode === 'batch'} icon="upload_file" title="Recorded session" detail="Audio, photos and repo" onClick={() => setMode('batch')} /><ModeButton selected={mode === 'live'} icon="graphic_eq" title="Live bench session" detail="Mic and incremental notes" onClick={() => setMode('live')} /></div></div>{createError && <div className="rounded-lg border border-alert/30 bg-alert-deep/15 p-3 text-xs text-alert">{createError}</div>}<p className="text-[11px] leading-relaxed text-muted">Sessions are stored locally under the configured Devlog data directory. Generated documents are downloadable as a bundle.</p></div><div className="flex justify-end gap-2 border-t border-line px-5 py-4"><button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-line px-4 py-2 text-xs text-body hover:text-white">Cancel</button><button disabled={saving} className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-surface-0 disabled:opacity-50">{saving ? 'Creating…' : 'Create session'}</button></div></form></div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><div className="font-mono text-base text-white">{value}</div><div className="mt-0.5 text-[10px] text-muted">{label}</div></div>; }

function ModeButton({ selected, icon, title, detail, onClick }: { selected: boolean; icon: string; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border p-3 text-left transition-colors ${selected ? 'border-white/50 bg-surface-3' : 'border-line bg-surface-0 hover:border-line-strong'}`}><span className="material-symbols-outlined text-lg text-white">{icon}</span><span className="mt-2 block text-xs text-white">{title}</span><span className="mt-1 block text-[10px] text-muted">{detail}</span></button>;
}
