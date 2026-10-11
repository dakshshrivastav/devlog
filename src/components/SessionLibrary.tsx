import { useState, type FormEvent } from 'react';
import type { HealthResponse, Session } from '../../shared/schema';
import { formatClock, formatDuration, formatPercent } from '../../shared/format';

export function SessionLibrary({
  sessions,
  loading,
  error,
  health,
  healthError,
  healthLoading,
  onOpen,
  onRetry,
  onDelete,
  onCreate,
}: {
  sessions: Session[];
  loading: boolean;
  error?: string;
  health?: HealthResponse;
  healthError?: string;
  healthLoading: boolean;
  onOpen: (session: Session) => void;
  onRetry: () => void;
  onDelete: (sessionId: string) => Promise<void>;
  onCreate: (name: string, mode: 'batch' | 'live') => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'batch' | 'live'>('batch');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate(name.trim(), mode);
      setCreating(false);
      setName('');
      setCreateError(null);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Could not create the session.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete this session.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-surface-2/70 via-surface-1/25 to-transparent" />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-12">
        <header className="mb-8 flex flex-col justify-between gap-6 border-b border-line/70 pb-8 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Local build journal
            </div>
            <h1 className="font-headline text-5xl font-light tracking-[-0.06em] text-white sm:text-7xl">devlog<span className="text-muted">.</span></h1>
            <p className="mt-4 max-w-[62ch] text-sm font-light leading-7 text-body sm:text-base">
              Talk through your build. Turn voice, bench photos and Git history into evidence-linked documentation—without starting from a blank page.
            </p>
          </div>
          <button
            onClick={() => { setCreateError(null); setCreating(true); }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-medium text-surface-0 shadow-[0_8px_30px_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:bg-ink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span className="material-symbols-outlined text-lg">add</span> New session
          </button>
        </header>

        <RuntimeStatus health={health} loading={healthLoading} error={healthError} onRetry={onRetry} />

        <section className="mt-10" aria-labelledby="sessions-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-3">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.17em] text-muted">Workspace</p>
              <h2 id="sessions-heading" className="font-headline text-2xl font-light tracking-tight text-white">Your sessions</h2>
            </div>
            <div className="font-mono text-[11px] text-muted">{sessions.length.toString().padStart(2, '0')} stored locally</div>
          </div>

          {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-alert/30 bg-alert-deep/15 p-4 text-sm text-alert"><span>{error}</span><button onClick={onRetry} className="text-xs underline underline-offset-4">Retry</button></div>}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading sessions">
              {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-xl border border-line bg-surface-2/70" />)}
            </div>
          ) : sessions.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => <SessionCard key={session.id} session={session} onOpen={() => onOpen(session)} onDelete={() => { setDeleteError(null); setDeleteTarget(session); }} />)}
            </div>
          ) : !error ? (
            <div className="grid min-h-[300px] place-items-center rounded-xl border border-dashed border-line-strong/70 bg-surface-1/50 px-6 py-12 text-center">
              <div className="max-w-md">
                <span className="material-symbols-outlined mb-4 grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface-2 text-2xl text-white">graphic_eq</span>
                <p className="font-headline text-xl font-light text-white">Start with what happened at the bench.</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">Create a recorded session for audio, photos and repository history, or a live session to capture ideas as you speak.</p>
                <button onClick={() => { setCreateError(null); setCreating(true); }} className="mt-5 rounded-lg border border-line-strong bg-surface-2 px-4 py-2.5 text-xs text-white transition hover:border-muted hover:bg-surface-3">Create your first session <span aria-hidden="true">→</span></button>
              </div>
            </div>
          ) : null}
        </section>

        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-line/50 pt-5 text-[10px] text-muted sm:flex-row sm:items-center">
          <span>Evidence first. Unknowns stay questions.</span>
          <span className="font-mono uppercase tracking-wider">Private local workspace · v{health?.version ?? '—'}</span>
        </footer>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setCreating(false); }}>
          <form onSubmit={(event) => void submit(event)} className="w-full max-w-lg overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div><p className="font-mono text-[10px] uppercase tracking-widest text-muted">New record</p><h2 className="mt-1 font-headline text-lg text-white">Build session</h2></div>
              <button type="button" disabled={saving} onClick={() => setCreating(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-white disabled:opacity-50"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-5 p-5">
              <label className="block"><span className="mb-2 block text-xs text-body">Project or session name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Relay controller bring-up" className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-line-strong" /></label>
              <fieldset><legend className="mb-2 text-xs text-body">Capture mode</legend><div className="grid grid-cols-2 gap-2"><ModeButton selected={mode === 'batch'} icon="upload_file" title="Recorded" detail="Audio, photos & repo" onClick={() => setMode('batch')} /><ModeButton selected={mode === 'live'} icon="graphic_eq" title="Live bench" detail="Mic & evolving notes" onClick={() => setMode('live')} /></div></fieldset>
              {createError && <div role="alert" className="rounded-lg border border-alert/30 bg-alert-deep/15 p-3 text-xs text-alert">{createError}</div>}
              <p className="text-[11px] leading-relaxed text-muted">Captures and generated documents stay in this device’s configured Devlog data directory.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4"><button type="button" disabled={saving} onClick={() => setCreating(false)} className="rounded-lg border border-line px-4 py-2 text-xs text-body transition hover:text-white disabled:opacity-50">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-surface-0 transition hover:bg-ink-hover disabled:opacity-50"><span className={`material-symbols-outlined text-sm ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'arrow_forward'}</span>{saving ? 'Creating…' : 'Create session'}</button></div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-session-title" className="w-full max-w-md overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl">
            <div className="border-b border-line px-5 py-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted">Remove local record</p><h2 id="delete-session-title" className="mt-1 font-headline text-lg text-white">Delete “{deleteTarget.name}”?</h2></div>
            <div className="space-y-4 p-5"><p className="text-sm leading-relaxed text-body">This permanently removes the session’s captures, evidence, transcript and generated documents from the local store.</p>{deleteError && <p role="alert" className="rounded-lg border border-alert/30 bg-alert-deep/15 p-3 text-xs text-alert">{deleteError}</p>}</div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4"><button disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-line px-4 py-2 text-xs text-body transition hover:text-white disabled:opacity-50">Keep session</button><button disabled={deleting} onClick={() => void confirmDelete()} className="rounded-lg border border-alert/30 bg-alert-deep/30 px-4 py-2 text-xs font-medium text-alert transition hover:bg-alert-deep/50 disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete session'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function RuntimeStatus({ health, loading, error, onRetry }: { health?: HealthResponse; loading: boolean; error?: string; onRetry: () => void }) {
  const connected = Boolean(health?.ok);
  const unavailable = !connected && !loading;
  return (
    <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface-1 sm:grid-cols-3" aria-label="Local runtime status">
      <div className="flex items-center gap-3 border-b border-line p-4 sm:border-b-0 sm:border-r">
        <span className={`grid h-9 w-9 place-items-center rounded-lg border ${connected ? 'border-white/15 bg-white/5 text-white' : unavailable ? 'border-alert/20 bg-alert-deep/15 text-alert' : 'border-line-strong bg-surface-2 text-muted'}`}><span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>{connected ? 'dns' : unavailable ? 'cloud_off' : 'progress_activity'}</span></span>
        <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-widest text-muted">Local API</p><p className="mt-1 truncate text-xs text-white">{loading ? 'Checking connection…' : connected ? 'Connected · private store' : 'Connection unavailable'}</p></div>
        {!connected && !loading && <button onClick={onRetry} title={error ?? 'Retry connection'} className="ml-auto text-[10px] text-body underline underline-offset-4">Retry</button>}
      </div>
      <div className="flex items-center gap-3 border-b border-line p-4 sm:border-b-0 sm:border-r">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-surface-2 text-body"><span className="material-symbols-outlined text-lg">{health?.mock ? 'science' : 'auto_awesome'}</span></span>
        <div><p className="font-mono text-[9px] uppercase tracking-widest text-muted">Generation</p><p className="mt-1 text-xs text-white">{loading ? 'Reading runtime…' : health?.mock ? 'Fixture-backed mock mode' : health?.geminiAuth === 'vertex-adc' ? 'Gemma via Vertex ADC' : health?.providers.gemini ? 'Gemma API key configured' : 'Gemma not configured'}</p></div>
      </div>
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-surface-2 text-body"><span className="material-symbols-outlined text-lg">graphic_eq</span></span>
        <div><p className="font-mono text-[9px] uppercase tracking-widest text-muted">Transcription</p><p className="mt-1 text-xs text-white">{loading ? 'Reading runtime…' : health?.mock ? 'Fixture-backed mock mode' : health?.providers.elevenlabs ? 'ElevenLabs key configured' : 'ElevenLabs key not configured'}</p></div>
      </div>
    </section>
  );
}

function SessionCard({ session, onOpen, onDelete }: { session: Session; onOpen: () => void; onDelete: () => void }) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface-2 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-3">
      <span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full border border-white/[0.04] transition duration-300 group-hover:scale-125" />
      <div className="relative mb-6 flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-0 text-white"><span className="material-symbols-outlined">{session.mode === 'live' ? 'graphic_eq' : 'memory'}</span></span>
        <div className="flex items-center gap-1.5"><span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide ${session.status === 'ready' ? 'border-line-strong text-body' : 'border-white/20 bg-white/[0.04] text-white'}`}>{session.status}</span>{session.mock && <span className="rounded-full border border-line/60 px-2 py-1 font-mono text-[9px] text-muted">MOCK</span>}<button onClick={onDelete} aria-label={`Delete ${session.name}`} title="Delete session" className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-alert-deep/20 hover:text-alert focus-visible:outline focus-visible:outline-2 focus-visible:outline-alert"><span className="material-symbols-outlined text-base">delete</span></button></div>
      </div>
      <button onClick={onOpen} className="relative block w-full rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <h3 className="truncate font-headline text-lg font-normal text-white">{session.name}</h3>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted">{session.mode === 'live' ? 'Live bench' : 'Recorded'} · {formatClock(session.createdAt)}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line/60 pt-4"><Metric label="Evidence" value={String(session.counts.evidence)} /><Metric label="Grounded" value={formatPercent(session.grounding.percent)} /><Metric label="Duration" value={formatDuration(session.durationSec)} /></div>
        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted"><span className="truncate">{session.repoBranch ? `Branch ${session.repoBranch}` : 'No repository linked'}</span><span className="flex shrink-0 items-center gap-1 transition-colors group-hover:text-white">Open <span className="material-symbols-outlined text-sm">arrow_forward</span></span></div>
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="font-mono text-sm text-white">{value}</div><div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted">{label}</div></div>;
}

function ModeButton({ selected, icon, title, detail, onClick }: { selected: boolean; icon: string; title: string; detail: string; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-lg border p-3 text-left transition-colors ${selected ? 'border-white/40 bg-surface-3' : 'border-line bg-surface-0 hover:border-line-strong'}`}><span className="material-symbols-outlined text-lg text-white">{icon}</span><span className="mt-2 block text-xs text-white">{title}</span><span className="mt-1 block text-[10px] text-muted">{detail}</span></button>;
}
