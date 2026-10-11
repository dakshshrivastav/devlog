import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActiveView, LiveTokenResponse, SearchResult, Session } from '../shared/schema';
import { formatDuration } from '../shared/format';
import { api, openGapCount } from './lib/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PhotoLightbox } from './components/PhotoLightbox';
import { SearchModal } from './components/SearchModal';
import { ExportModal } from './components/ExportModal';
import { CaptureModal } from './components/CaptureModal';
import { SessionLibrary } from './components/SessionLibrary';
import { SessionView } from './components/SessionView';
import { LiveCaptureController } from './components/LiveCaptureController';

const SESSION_KEY = 'devlog.active-session';
const BUNDLE_KEY = (id: string) => ['session-bundle', id] as const;

export default function App() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) ?? '');
  const [view, setView] = useState<ActiveView>('overview');
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string; meta?: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sseEvents, setSseEvents] = useState<{ at: string; type: string; stage?: string; message?: string; level?: string }[]>([]);
  const [liveToken, setLiveToken] = useState<LiveTokenResponse | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);

  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: api.sessions });
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
  });
  const sessions = sessionsQuery.data ?? [];
  const selected = sessions.find((session) => session.id === sessionId);

  useEffect(() => {
    if (!sessionId && sessions.length) setSessionId(sessions[0].id);
    if (sessionId && sessions.length && !sessions.some((s) => s.id === sessionId)) setSessionId(sessions[0].id);
  }, [sessionId, sessions]);
  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionId]);

  const bundleQuery = useQuery({
    queryKey: BUNDLE_KEY(sessionId),
    queryFn: () => api.bundle(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => query.state.data?.session.status === 'processing' ? 1800 : false,
  });
  const bundle = bundleQuery.data;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setSseEvents([]);
    const source = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    const refresh = (entry?: { type?: string }) => {
      const relevant = new Set(['stage', 'evidence', 'artifact', 'gap', 'graph', 'done', 'error']);
      if (entry?.type && relevant.has(entry.type)) void queryClient.invalidateQueries({ queryKey: BUNDLE_KEY(sessionId) });
      if (!entry?.type || entry.type === 'stage' || entry.type === 'done' || entry.type === 'error') {
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
    };
    source.addEventListener('snapshot', (event) => {
      try {
        const snapshot = JSON.parse((event as MessageEvent).data) as { events?: typeof sseEvents };
        if (snapshot.events) setSseEvents(snapshot.events);
      } catch { /* Ignore a partial reconnect frame. */ }
    });
    source.addEventListener('run', (event) => {
      let entry: (typeof sseEvents)[number] | undefined;
      try {
        entry = JSON.parse((event as MessageEvent).data) as (typeof sseEvents)[number];
        if (entry) setSseEvents((prev) => [...prev, entry!].slice(-200));
      } catch { /* Ignore malformed provider output; the server log preserves it. */ }
      refresh(entry);
    });
    source.onerror = () => {
      // EventSource reconnects automatically; query polling remains the fallback.
    };
    return () => source.close();
  }, [sessionId, queryClient]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setExportOpen(false);
        setCaptureOpen(false);
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  const createMutation = useMutation({
    mutationFn: ({ name, mode }: { name: string; mode: 'batch' | 'live' }) => api.createSession({ name: name || undefined, mode }),
    onSuccess: (session) => {
      queryClient.setQueryData<Session[]>(['sessions'], (prev = []) => [session, ...prev]);
      setSessionId(session.id);
      setView('overview');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Session[]>(['sessions'], (prev = []) => prev.filter((session) => session.id !== id));
      queryClient.removeQueries({ queryKey: BUNDLE_KEY(id) });
      if (sessionId === id) {
        setSessionId('');
        setView('sessions');
      }
    },
  });

  const process = useCallback(async (synthesizeOnly = false) => {
    if (!sessionId) return;
    await api.process(sessionId, synthesizeOnly);
    await queryClient.invalidateQueries({ queryKey: BUNDLE_KEY(sessionId) });
    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [sessionId, queryClient]);

  const resolveGap = useCallback(async (gapId: string, answer?: string, action: 'resolve' | 'defer' = 'resolve', voiceFile?: File) => {
    if (!sessionId) return;
    const updated = voiceFile
      ? await api.resolveGapVoice(sessionId, gapId, voiceFile)
      : await api.resolveGap(sessionId, gapId, { answer, action });
    queryClient.setQueryData(BUNDLE_KEY(sessionId), updated);
    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [sessionId, queryClient]);

  const startLive = useCallback(async () => {
    if (!sessionId) return;
    if (liveToken) throw new Error('End the current live microphone session before starting another one.');
    const token = await api.liveToken(sessionId);
    setLiveSessionId(sessionId);
    setLiveToken(token);
    setView('live-flowchart');
    await queryClient.invalidateQueries({ queryKey: BUNDLE_KEY(sessionId) });
    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [sessionId, liveToken, queryClient]);

  const finishLive = useCallback(() => {
    const finishedId = liveSessionId;
    setLiveToken(null);
    setLiveSessionId(null);
    if (finishedId) void queryClient.invalidateQueries({ queryKey: BUNDLE_KEY(finishedId) });
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [liveSessionId, queryClient]);

  const committedLiveEvent = useCallback(() => {
    if (liveSessionId) void queryClient.invalidateQueries({ queryKey: BUNDLE_KEY(liveSessionId) });
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [liveSessionId, queryClient]);

  const openSearchResult = (result: SearchResult) => {
    setSessionId(result.sessionId);
    setView(result.targetView);
  };

  const openSession = (session: Session) => {
    setSessionId(session.id);
    setView('overview');
  };

  const selectedDuration = useMemo(() => {
    if (!bundle) return '—';
    const session = bundle.session;
    if (session.status === 'capturing' && session.startedAt) {
      const started = Date.parse(session.startedAt);
      return Number.isNaN(started) ? formatDuration(session.durationSec) : formatDuration(Math.max(0, Math.round((now - started) / 1000)));
    }
    return formatDuration(session.durationSec);
  }, [bundle, now]);

  if (sessionsQuery.isLoading) return <LoadingScreen label="Opening local session store…" />;

  const libraryError = sessionsQuery.error instanceof Error ? sessionsQuery.error.message : undefined;
  const showLibrary = !sessionId || view === 'sessions' || !selected;

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 font-body text-ink-text selection:bg-line-strong selection:text-white">
      {showLibrary ? (
        <SessionLibrary
          sessions={sessions}
          loading={sessionsQuery.isLoading}
          error={libraryError}
          health={healthQuery.data}
          healthError={healthQuery.error instanceof Error ? healthQuery.error.message : undefined}
          healthLoading={healthQuery.isLoading}
          onOpen={openSession}
          onRetry={() => { void sessionsQuery.refetch(); void healthQuery.refetch(); }}
          onDelete={(id) => deleteMutation.mutateAsync(id)}
          onCreate={async (name, mode) => { await createMutation.mutateAsync({ name, mode }); }}
        />
      ) : (
        <>
          <Header
            activeView={view}
            sessionName={bundle?.session.name ?? selected?.name ?? 'Session'}
            sessionTime={selectedDuration}
            status={bundle?.session.status ?? selected?.status ?? 'loading'}
            runtime={healthQuery.data}
            onSelectView={setView}
            onOpenSessions={() => setView('sessions')}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenExport={() => setExportOpen(true)}
            onAddCapture={() => setCaptureOpen(true)}
          />
          <main className="flex-1 pt-[104px] lg:pt-16">
            {bundleQuery.isLoading && <LoadingScreen label="Loading session evidence…" />}
            {bundleQuery.error && <div className="mx-auto mt-12 max-w-xl rounded-xl border border-alert/30 bg-alert-deep/15 p-5 text-sm text-alert">{bundleQuery.error instanceof Error ? bundleQuery.error.message : 'Could not load this session.'}<button onClick={() => void bundleQuery.refetch()} className="ml-3 underline">Retry</button></div>}
            {bundle && <SessionView bundle={bundle} view={view} onSelectView={setView} onPhoto={(src, caption, meta) => setLightbox({ src, caption, meta })} onResolveGap={resolveGap} onExport={() => setExportOpen(true)} runEvents={sseEvents.length ? sseEvents : bundle.run?.events ?? []} />}
          </main>
          <Footer sessionName={bundle?.session.name ?? selected?.name} />
          {bundle && <>
            <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelect={openSearchResult} />
            <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} sessionId={sessionId} openGapsCount={openGapCount(bundle.gaps)} artifacts={bundle.artifacts} />
            {captureOpen && <CaptureModal sessionId={sessionId} sessionMode={bundle.session.mode} onClose={() => setCaptureOpen(false)} onUploaded={async () => { await queryClient.invalidateQueries({ queryKey: BUNDLE_KEY(sessionId) }); }} onProcess={() => process(false)} onStartLive={startLive} />}
          </>}
        </>
      )}
      {liveToken && liveSessionId && <LiveCaptureController key={liveSessionId} sessionId={liveSessionId} token={liveToken} onEnded={finishLive} onCommitted={committedLiveEvent} />}
      <PhotoLightbox imageSrc={lightbox?.src ?? null} caption={lightbox?.caption} metadata={lightbox?.meta} onClose={() => setLightbox(null)} />
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return <div className="grid min-h-screen place-items-center bg-surface-0"><div className="flex items-center gap-3 text-sm text-muted"><span className="material-symbols-outlined animate-spin text-white">progress_activity</span>{label}</div></div>;
}
