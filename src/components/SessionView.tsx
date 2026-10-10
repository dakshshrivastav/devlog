import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveView, Artifact, EvidenceItem, SessionBundle } from '../../shared/schema';
import { formatClock, formatCount, formatDuration, formatPercent } from '../../shared/format';
import { MermaidDiagram, downloadText } from './MermaidDiagram';
import { IdeaProximityMap } from './IdeaProximityMap';
import { api } from '../lib/api';

type PhotoHandler = (src: string, caption?: string, meta?: string) => void;

export function SessionView({
  bundle,
  view,
  onSelectView,
  onPhoto,
  onResolveGap,
  onExport,
  runEvents,
}: {
  bundle: SessionBundle;
  view: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onPhoto: PhotoHandler;
  onResolveGap: (gapId: string, answer?: string, action?: 'resolve' | 'defer', voiceFile?: File) => Promise<void>;
  onExport: () => void;
  runEvents: { at: string; type: string; stage?: string; message?: string; level?: string }[];
}) {
  switch (view) {
    case 'timeline':
      return <Timeline bundle={bundle} onPhoto={onPhoto} onSelectView={onSelectView} />;
    case 'living-map':
      return <LivingMap bundle={bundle} onPhoto={onPhoto} onSelectView={onSelectView} />;
    case 'live-flowchart':
      return <IdeaFlow bundle={bundle} onSelectView={onSelectView} />;
    case 'observations':
      return <Observations bundle={bundle} onPhoto={onPhoto} onResolveGap={onResolveGap} />;
    case 'system-diagrams':
      return <SystemDiagrams bundle={bundle} />;
    case 'bom-and-parts':
      return <BomView bundle={bundle} onPhoto={onPhoto} onResolveGap={onResolveGap} />;
    case 'troubleshooting':
      return <Troubleshooting bundle={bundle} onPhoto={onPhoto} />;
    case 'finished-docs':
      return <FinishedDocs bundle={bundle} onSelectView={onSelectView} onExport={onExport} />;
    case 'overview':
    default:
      return <Overview bundle={bundle} onPhoto={onPhoto} onSelectView={onSelectView} onExport={onExport} runEvents={runEvents} />;
  }
}

function Page({
  kicker,
  title,
  description,
  right,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] animate-fadeIn px-4 py-8 sm:px-6 md:py-10 lg:px-12">
      <header className="mb-8 flex flex-col justify-between gap-5 border-b border-line/50 pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> {kicker}
          </div>
          <h1 className="font-headline text-3xl font-light tracking-tight text-white sm:text-5xl">{title}</h1>
          {description && <p className="mt-2 max-w-[70ch] text-sm font-light leading-relaxed text-body">{description}</p>}
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

function SectionTitle({ title, meta, children }: { title: string; meta?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-line/50 pb-2">
      <div>
        <h2 className="font-headline text-lg font-light text-white sm:text-xl">{title}</h2>
        {meta && <p className="mt-0.5 text-xs text-muted">{meta}</p>}
      </div>
      {children}
    </div>
  );
}

function Surface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface-2 shadow-sm ${className}`}>{children}</section>;
}

function Pill({ children, alert = false }: { children: React.ReactNode; alert?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] ${alert ? 'border-alert/30 bg-alert-deep/20 text-alert' : 'border-line-strong/50 bg-surface-3 text-body'}`}>
      {children}
    </span>
  );
}

function SourceChips({ ids, evidence }: { ids: string[]; evidence: EvidenceItem[] }) {
  const byId = useMemo(() => new Map(evidence.map((e) => [e.id, e.sourceTag])), [evidence]);
  if (!ids.length) return <span className="text-[10px] italic text-muted">No source linked</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className="rounded bg-surface-0 px-1.5 py-0.5 font-mono text-[10px] text-mono">[{byId.get(id) ?? id}]</span>
      ))}
    </span>
  );
}

function Stat({ label, value, detail, alert = false }: { label: string; value: string; detail?: string; alert?: boolean }) {
  return (
    <Surface className="p-4 sm:p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className={`mt-2 font-headline text-3xl font-light tracking-tight ${alert ? 'text-alert' : 'text-white'}`}>{value}</div>
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </Surface>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong/60 px-6 py-10 text-center">
      <span className="material-symbols-outlined mb-3 text-[24px] text-muted">hourglass_empty</span>
      <p className="font-headline text-base text-white">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function Overview({
  bundle,
  onPhoto,
  onSelectView,
  onExport,
  runEvents,
}: {
  bundle: SessionBundle;
  onPhoto: PhotoHandler;
  onSelectView: (v: ActiveView) => void;
  onExport: () => void;
  runEvents: { at: string; type: string; stage?: string; message?: string; level?: string }[];
}) {
  const { session, evidence, artifacts, gaps, bom } = bundle;
  const openGaps = gaps.filter((g) => g.status === 'open');
  const photos = evidence.filter((e) => e.photo);
  const measurement = evidence.find((e) => e.measurement);
  const recent = [...runEvents].slice(-5).reverse();

  return (
    <Page
      kicker={`Session ${session.slug} · ${session.mode} capture`}
      title="Session Overview"
      description={`${session.name} · ${formatDuration(session.durationSec)} · ${evidence.length} evidence anchors, grounded in the session timeline.`}
      right={<button onClick={onExport} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-surface-0 transition-colors hover:bg-ink-hover"><span className="material-symbols-outlined text-base">folder_zip</span>Download bundle</button>}
    >
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Session duration" value={formatDuration(session.durationSec)} detail={session.status} />
        <Stat label="Evidence anchors" value={formatCount(session.counts.evidence)} detail={`${session.counts.voice} voice · ${session.counts.photo} photo · ${session.counts.commit} git`} />
        <Stat label="Grounded statements" value={formatPercent(session.grounding.percent)} detail={`${session.grounding.sourced} sourced · ${session.grounding.unsourced} unsourced`} />
        <Stat label="Open observations" value={formatCount(openGaps.length)} detail="in GAPS.md" alert={openGaps.length > 0} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="flex flex-col gap-8 xl:col-span-7">
          <section>
            <SectionTitle title="Session narrative" meta="Built from recorded evidence · claims remain source-linked" />
            <Surface className="p-5 sm:p-7">
              {artifacts.some((a) => a.name === 'README.md') ? (
                <DocumentPreview bundle={bundle} artifact={artifacts.find((a) => a.name === 'README.md')!} compact />
              ) : <Empty title="No narrative generated yet" detail="Add audio, photos, notes, or a repository, then process the session." />}
            </Surface>
          </section>

          <section>
            <SectionTitle title="Key deliverables" meta={`${artifacts.length} generated artifacts`} />
            <Surface className="divide-y divide-line/60 px-4">
              {artifacts.map((artifact) => (
                <button key={artifact.id} onClick={() => onSelectView(artifact.targetView as ActiveView)} className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-surface-3/40">
                  <span className="material-symbols-outlined text-[18px] text-muted">{artifactIcon(artifact)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-white">{artifact.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{artifact.summary ?? artifact.title}</span>
                  </span>
                  <Pill alert={artifact.status === 'needs-input'}>{artifact.statusLabel}</Pill>
                </button>
              ))}
            </Surface>
          </section>
        </div>

        <div className="flex flex-col gap-8 xl:col-span-5">
          <section>
            <SectionTitle title="Visual evidence" meta="Bench captures from this session" />
            {photos.length ? (
              <div className="grid grid-cols-2 gap-3">
                {photos.slice(0, 4).map((item) => (
                  <PhotoCard key={item.id} item={item} onClick={() => item.photo && onPhoto(item.photo.url, item.photo.caption ?? item.label, item.verification)} />
                ))}
              </div>
            ) : <Empty title="No photos captured" detail="Bench photos will appear here, linked to their EXIF timestamps." />}
          </section>

          {measurement && (
            <section>
              <SectionTitle title="Measurement evidence" meta="Values spoken or typed during the session" />
              <Surface className="p-5">
                {evidence.filter((e) => e.measurement).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 border-b border-line/50 py-3 last:border-0">
                    <div><div className="text-sm text-white">{item.measurement?.quantity}</div><div className="mt-1 text-xs text-muted">{item.measurement?.instrument ?? item.verification}</div></div>
                    <strong className="font-mono text-lg font-normal text-white">{item.measurement?.value}{item.measurement?.unit ? ` ${item.measurement.unit}` : ''}</strong>
                  </div>
                ))}
              </Surface>
            </section>
          )}

          <section>
            <SectionTitle title="Open gaps" meta="Questions rather than invented specifications" />
            {openGaps.length ? (
              <div className="flex flex-col gap-2">
                {openGaps.slice(0, 3).map((gap) => (
                  <button key={gap.id} onClick={() => onSelectView('observations')} className="rounded-lg border border-alert/20 bg-alert-deep/10 p-4 text-left transition-colors hover:border-alert/50">
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-alert">GAP {gap.number} · {gap.priority.toUpperCase()}</span><span className="material-symbols-outlined text-sm text-muted">arrow_forward</span></div>
                    <p className="mt-2 text-sm text-white">{gap.question}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{gap.description}</p>
                  </button>
                ))}
              </div>
            ) : <Empty title="No open gaps" detail="All currently identified questions have an answer." />}
          </section>

          <section>
            <SectionTitle title="Processing activity" meta="Pipeline updates streamed from the server" />
            <Surface className="divide-y divide-line/60 px-4">
              {recent.length ? recent.map((event, i) => <div key={`${event.at}-${i}`} className="flex gap-3 py-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" /><div className="min-w-0"><div className="text-xs text-white">{event.message ?? event.stage ?? event.type}</div><div className="mt-1 font-mono text-[10px] text-muted">{formatClock(event.at)} · {event.level ?? 'info'}</div></div></div>) : <p className="py-4 text-xs text-muted">No pipeline events recorded yet.</p>}
            </Surface>
          </section>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink icon="timeline" label="Timeline" onClick={() => onSelectView('timeline')} />
        <QuickLink icon="schema" label="Hardware fact sheet" onClick={() => onSelectView('system-diagrams')} />
        <QuickLink icon="hub" label="Idea flowchart" onClick={() => onSelectView('live-flowchart')} />
        <QuickLink icon="inventory_2" label={`${bom.items.length} BOM rows`} onClick={() => onSelectView('bom-and-parts')} />
      </div>
    </Page>
  );
}

function Timeline({ bundle, onPhoto, onSelectView }: { bundle: SessionBundle; onPhoto: PhotoHandler; onSelectView: (v: ActiveView) => void }) {
  const [kind, setKind] = useState('all');
  const items = bundle.evidence.filter((item) => kind === 'all' || item.kind === kind);
  const kinds = ['all', 'voice', 'photo', 'commit', 'measurement', 'note'];
  return (
    <Page kicker="Chronicle · Evidence stream" title="Timeline" description="Spoken notes, bench photos, measurements and git commits, aligned by the timestamp each source actually provides.">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line/50 pb-4">
        {kinds.map((filter) => <button key={filter} onClick={() => setKind(filter)} className={`rounded px-3 py-1.5 text-xs capitalize transition-colors ${kind === filter ? 'bg-white text-surface-0' : 'text-muted hover:bg-surface-3 hover:text-white'}`}>{filter === 'all' ? `All · ${bundle.evidence.length}` : `${filter} · ${bundle.evidence.filter((e) => e.kind === filter).length}`}</button>)}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="relative flex flex-col gap-3 lg:col-span-8">
          <div className="absolute bottom-2 left-[19px] top-2 w-px bg-line-strong/70" />
          {items.map((item) => <EvidenceCard key={item.id} item={item} sessionId={bundle.session.id} allowAudio={!bundle.session.mock && bundle.session.mode === 'batch'} onPhoto={onPhoto} />)}
          {!items.length && <Empty title="No evidence in this filter" detail="Upload a capture or change the filter." />}
        </div>
        <aside className="flex flex-col gap-5 lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
          <Surface className="p-5"><SectionTitle title="Timeline summary" meta={bundle.session.name} /><div className="font-headline text-5xl font-light text-white">{bundle.evidence.length}</div><div className="mb-4 text-xs text-muted">evidence anchors</div><SummaryRows bundle={bundle} /></Surface>
          <Surface className="p-5"><SectionTitle title="Grounding check" /><div className="mb-2 flex items-center gap-2 text-sm text-white"><span className="material-symbols-outlined text-base">verified_user</span>{bundle.session.grounding.sourced}/{bundle.session.grounding.sourced + bundle.session.grounding.unsourced} statements sourced</div><p className="text-xs leading-relaxed text-muted">Unsupported values are not presented as facts. Open questions are kept in GAPS.md.</p><button onClick={() => onSelectView('observations')} className="mt-4 text-xs text-white underline underline-offset-4">Review open gaps ({openGapCount(bundle)})</button></Surface>
        </aside>
      </div>
    </Page>
  );
}

function EvidenceCard({ item, sessionId, allowAudio, onPhoto }: { item: EvidenceItem; sessionId: string; allowAudio: boolean; onPhoto: PhotoHandler }) {
  const icon = item.kind === 'voice' ? 'mic' : item.kind === 'photo' ? 'photo_camera' : item.kind === 'commit' ? 'terminal' : item.kind === 'measurement' ? 'speed' : 'edit_note';
  return (
    <article className="relative z-10 ml-10 rounded-xl border border-line bg-surface-2 p-4 transition-colors hover:border-line-strong sm:p-5">
      <span className="absolute -left-[31px] top-5 grid h-5 w-5 place-items-center rounded-full border border-line-strong bg-surface-0"><span className="material-symbols-outlined text-[11px] text-body">{icon}</span></span>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-mono text-[11px] text-white"><span>{formatClock(item.instant)}</span><span className="text-line-dim">·</span><span className="capitalize text-muted">{item.kind}</span></div><Pill>{item.sourceTag}</Pill></div>
      <h3 className="font-headline text-base font-normal text-white">{item.label}</h3>
      {(item.detail || item.voice?.quote) && <p className="mt-1.5 text-sm font-light leading-relaxed text-body">{item.voice?.quote ?? item.detail}</p>}
      {item.commit?.diff?.length ? <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-0 p-3 font-mono text-[11px] leading-relaxed text-body">{item.commit.diff.map((line) => <span key={`${line.lineNum}-${line.kind}`} className={`block ${line.kind === 'added' ? 'text-white' : line.kind === 'removed' ? 'text-alert' : 'text-muted'}`}>{line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '} {line.content}</span>)}</pre> : null}
      {item.measurement && <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-0 p-3"><span className="text-xs text-muted">{item.measurement.quantity}</span><strong className="font-mono text-white">{item.measurement.value}{item.measurement.unit ? ` ${item.measurement.unit}` : ''}</strong></div>}
      {allowAudio && item.voice?.audioId && <audio controls preload="metadata" src={`/api/sessions/${encodeURIComponent(sessionId)}/media/${encodeURIComponent(item.voice.audioId)}`} className="mt-3 h-9 w-full accent-white" />}
      {item.photo && <button onClick={() => onPhoto(item.photo!.url, item.photo!.caption ?? item.label, item.verification)} className="group mt-3 block w-full overflow-hidden rounded-lg border border-line bg-surface-0 text-left"><img src={item.photo.url} alt={item.photo.caption ?? item.label} className="max-h-80 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" /><span className="block px-3 py-2 text-[11px] text-muted">{item.photo.caption ?? item.label} · {item.verification}</span></button>}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/50 pt-3"><span className="text-[10px] text-muted">{item.verification}</span><span className="font-mono text-[10px] text-muted">{item.instantIsNaive ? 'local EXIF time' : item.instant ? 'timestamped' : 'untimed'}</span></div>
    </article>
  );
}

function LivingMap({ bundle, onPhoto, onSelectView }: { bundle: SessionBundle; onPhoto: PhotoHandler; onSelectView: (v: ActiveView) => void }) {
  const lanes = [...new Set(bundle.chronology.entries.map((e) => e.lane))];
  const phases = bundle.chronology.phases;
  return (
    <Page kicker="Chronology · Build log" title="Living Map" description="A time-ordered map of the build: workstreams, evidence, commits and the milestones that changed the project's direction." right={<Pill>{bundle.chronology.entries.length} entries · {phases.length} phases</Pill>}>
      {bundle.chronology.entries.length ? <div className="space-y-8">
        {phases.map((phase, phaseIndex) => {
          const entries = bundle.chronology.entries.filter((entry) => entry.phaseId === phase.id);
          return <section key={phase.id} className="relative grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-3"><div className="sticky top-28 border-l border-line-strong pl-5"><div className="font-mono text-[10px] uppercase tracking-widest text-muted">Phase {String(phaseIndex + 1).padStart(2, '0')} · {formatClock(phase.startInstant)}</div><h2 className="mt-2 font-headline text-xl font-light text-white">{phase.title}</h2>{phase.summary && <p className="mt-2 text-xs leading-relaxed text-muted">{phase.summary}</p>}</div></div>
            <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3">
              {entries.map((entry, index) => <article key={entry.id} className="relative rounded-xl border border-line bg-surface-2 p-4" style={{ animationDelay: `${index * 35}ms` }}>
                <div className="mb-3 flex items-center justify-between gap-2"><Pill>{entry.lane}</Pill><span className="font-mono text-[10px] text-muted">{formatClock(entry.instant)}</span></div>
                <div className="font-headline text-sm text-white">{entry.title}</div>{entry.body && <p className="mt-2 text-xs leading-relaxed text-body">{entry.body}</p>}
                {entry.mediaUrl && <button onClick={() => onPhoto(entry.mediaUrl!, entry.mediaCaption ?? entry.title)} className="mt-3 block w-full overflow-hidden rounded-lg"><img src={entry.mediaUrl} alt={entry.mediaCaption ?? entry.title} className="h-36 w-full object-cover transition-transform hover:scale-105" /></button>}
                <div className="mt-3 border-t border-line/50 pt-3"><SourceChips ids={entry.sources} evidence={bundle.evidence} /></div>
              </article>)}
            </div>
          </section>;
        })}
      </div> : <Empty title="No chronology yet" detail="Process session evidence to create build phases and timeline entries." />}
      <div className="mt-8 flex flex-wrap gap-2"><QuickLink icon="timeline" label="Raw evidence timeline" onClick={() => onSelectView('timeline')} /><QuickLink icon="account_tree" label="Hardware fact sheet" onClick={() => onSelectView('system-diagrams')} /></div>
      <div className="sr-only">{lanes.join(', ')}</div>
    </Page>
  );
}

function IdeaFlow({ bundle, onSelectView }: { bundle: SessionBundle; onSelectView: (v: ActiveView) => void }) {
  const diagram = bundle.hardware.diagrams.find((d) => d.kind === 'live_flowchart');
  return (
    <Page kicker="Reasoning graph · Cross-cluster insights" title="Live Flowchart" description="Ideas develop in separate trains of thought. Cross-cluster links are surfaced only when the evidence supports the connection." right={<div className="flex gap-2"><Pill>{bundle.ideas.nodes.length} ideas</Pill><Pill>{bundle.ideas.clusters.length} clusters</Pill><Pill alert={openGapCount(bundle) > 0}>{openGapCount(bundle)} gaps</Pill></div>}>
      {bundle.ideas.nodes.length ? <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-8">
          <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-line px-5 py-3"><div><div className="font-headline text-sm text-white">Idea graph</div><div className="mt-1 text-[10px] text-muted">Mermaid source is generated from the sourced reasoning graph</div></div><Pill>{bundle.ideas.edges.length} relations</Pill></div><MermaidDiagram source={diagram?.mmd ?? ''} className="min-h-[360px]" /></Surface>
          <Surface className="overflow-hidden"><div className="border-b border-line px-5 py-3"><div className="font-headline text-sm text-white">Spatial relationship map</div><div className="mt-1 text-[10px] text-muted">Dagre positions ideas; cross-cluster proximity is a candidate, not a causal claim.</div></div><IdeaProximityMap graph={bundle.ideas} /></Surface>
          {bundle.ideas.affinities.filter((a) => a.status === 'confirmed').map((link) => {
            const a = bundle.ideas.nodes.find((n) => n.id === link.nodeA);
            const b = bundle.ideas.nodes.find((n) => n.id === link.nodeB);
            return <Surface key={link.id} className="border-white/15 p-5"><div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted"><span className="material-symbols-outlined text-base text-white">merge</span>Cross-cluster connection · evidence confirmed</div><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]"><NodeSummary node={a} /><div className="grid place-items-center text-muted"><span className="material-symbols-outlined">link</span></div><NodeSummary node={b} /></div><p className="mt-4 border-t border-line/50 pt-4 text-sm leading-relaxed text-white">{link.statement}</p><div className="mt-3"><SourceChips ids={link.sources} evidence={bundle.evidence} /></div></Surface>;
          })}
        </div>
        <aside className="flex flex-col gap-5 xl:col-span-4"><Surface className="p-5"><SectionTitle title="Thought clusters" meta="Each tree is a distinct line of reasoning" />{bundle.ideas.clusters.map((cluster) => <div key={cluster.id} className="mb-3 rounded-lg border border-line bg-surface-0 p-3"><div className="text-sm text-white">{cluster.title}</div>{cluster.subtitle && <p className="mt-1 text-xs text-muted">{cluster.subtitle}</p>}<p className="mt-2 font-mono text-[10px] text-muted">{bundle.ideas.nodes.filter((n) => n.clusterId === cluster.id).length} nodes</p></div>)}</Surface><Surface className="p-5"><SectionTitle title="Ideas" meta="Sorted by session time" />{[...bundle.ideas.nodes].sort((a, b) => (a.instant ?? '').localeCompare(b.instant ?? '')).map((node) => <div key={node.id} className="border-b border-line/50 py-3 last:border-0"><div className="flex items-center justify-between gap-2"><span className="text-xs text-white">{node.label}</span><Pill alert={node.hazard}>{node.kind}</Pill></div>{node.detail && <p className="mt-1 text-[11px] leading-relaxed text-muted">{node.detail}</p>}<div className="mt-2"><SourceChips ids={node.sources} evidence={bundle.evidence} /></div></div>)}</Surface><button onClick={() => onSelectView('observations')} className="rounded-lg border border-line bg-surface-2 p-4 text-left text-xs text-body hover:border-line-strong">Review {openGapCount(bundle)} unresolved question(s) <span className="ml-1 material-symbols-outlined align-middle text-sm">arrow_forward</span></button></aside>
      </div> : <Empty title="No reasoning graph yet" detail="The idea flowchart is synthesized from committed speech segments. Process a session with transcript evidence to build it." />}
    </Page>
  );
}

function SystemDiagrams({ bundle }: { bundle: SessionBundle }) {
  const diagrams = bundle.hardware.diagrams;
  const [selected, setSelected] = useState(diagrams[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const [browserParsed, setBrowserParsed] = useState<boolean | null>(null);
  const diagram = diagrams.find((d) => d.id === selected) ?? diagrams[0];
  useEffect(() => { if (!diagrams.some((d) => d.id === selected)) setSelected(diagrams[0]?.id ?? ''); }, [diagrams, selected]);
  useEffect(() => { setBrowserParsed(null); }, [selected]);
  const reportParse = useCallback((valid: boolean) => setBrowserParsed(valid), []);
  const copy = async () => {
    if (!diagram) return;
    await navigator.clipboard?.writeText(diagram.mmd);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const saveSvg = async () => {
    if (!diagram) return;
    try {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'Space Grotesk, sans-serif',
        themeVariables: {
          background: '#1c1b1c', primaryColor: '#201f20', primaryTextColor: '#e5e2e3',
          primaryBorderColor: '#353436', lineColor: '#8f9194', secondaryColor: '#161618',
          tertiaryColor: '#131314', clusterBkg: '#1c1b1c', clusterBorder: '#353436',
          edgeLabelBackground: '#1c1b1c', fontSize: '14px',
        },
        flowchart: { curve: 'basis', htmlLabels: true, padding: 18, nodeSpacing: 42, rankSpacing: 58 },
      });
      await mermaid.parse(diagram.mmd);
      const rendered = await mermaid.render(`export-${crypto.randomUUID().replace(/-/g, '')}`, diagram.mmd);
      downloadText(diagram.filename.replace(/\.mmd$/, '.svg'), rendered.svg, 'image/svg+xml;charset=utf-8');
    } catch {
      // The component displays the parse error inline; an invalid SVG is never downloaded.
    }
  };
  return (
    <Page kicker="Hardware fact sheet · Source-linked connections" title="System Diagrams" description="Physical components, nets and values grounded in the session evidence. The diagram source is stored as Mermaid and rendered as a real vector graph." right={diagram ? <Pill>{diagram.parseStatus === 'valid' ? 'Syntax parsed' : 'Check source'} · {diagram.lineCount} lines</Pill> : undefined}>
      {diagrams.length ? <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{diagrams.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`rounded-lg border px-3 py-2 text-xs transition-colors ${diagram?.id === item.id ? 'border-white bg-white text-surface-0' : 'border-line bg-surface-2 text-muted hover:text-white'}`}>{item.filename}</button>)}</div><div className="flex gap-2"><button onClick={() => void copy()} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-body hover:text-white">{copied ? 'Copied' : 'Copy source'}</button><button onClick={() => diagram && downloadText(diagram.filename, diagram.mmd)} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-body hover:text-white">Download .mmd</button><button onClick={() => void saveSvg()} className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-surface-0 hover:bg-ink-hover">Download SVG</button></div></div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12"><Surface className="overflow-hidden xl:col-span-8"><div className="flex items-center justify-between border-b border-line px-5 py-3"><div className="font-headline text-sm text-white">{diagram?.title}</div><Pill alert={browserParsed === false}>{browserParsed === true ? 'Browser syntax parsed' : browserParsed === false ? 'Browser parse error' : diagram?.parseStatus === 'valid' ? 'Server validated · rendering' : 'Mermaid invalid'}</Pill></div><MermaidDiagram source={diagram?.mmd ?? ''} className="min-h-[420px]" onParse={reportParse} /></Surface><aside className="flex flex-col gap-5 xl:col-span-4"><Surface className="p-5"><SectionTitle title="Grounding inspector" meta={`${bundle.hardware.nodes.length} components · ${bundle.hardware.edges.length} connections`} />{diagram?.sources.length ? <SourceChips ids={diagram.sources} evidence={bundle.evidence} /> : <p className="text-xs text-muted">No elements are sourced yet.</p>}{diagram?.errors.map((error) => <p key={error} className="mt-2 text-xs text-alert">{error}</p>)}</Surface><Surface className="p-5"><SectionTitle title="Hardware nodes" />{bundle.hardware.nodes.map((node) => <div key={node.id} className="border-b border-line/50 py-3 last:border-0"><div className="flex items-start justify-between gap-2"><span className="text-sm text-white">{node.designator && <span className="mr-2 font-mono text-muted">{node.designator}</span>}{node.name}</span><Pill alert={node.hazard}>{node.kind}</Pill></div>{node.value && <p className="mt-1 font-mono text-[11px] text-body">{node.value}</p>}<div className="mt-2"><SourceChips ids={node.sources} evidence={bundle.evidence} /></div></div>)}</Surface></aside></div>
      </> : <Empty title="No hardware diagrams yet" detail="The fact sheet will appear after hardware facts have been synthesized from captured evidence." />}
    </Page>
  );
}

function Observations({ bundle, onPhoto, onResolveGap }: { bundle: SessionBundle; onPhoto: PhotoHandler; onResolveGap: (id: string, answer?: string, action?: 'resolve' | 'defer', voiceFile?: File) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const resolve = async (id: string, action: 'resolve' | 'defer') => {
    setBusy(id);
    try {
      await onResolveGap(id, answers[id], action);
      setAnswers((prev) => ({ ...prev, [id]: '' }));
    } finally { setBusy(null); }
  };
  return (
    <Page kicker="Observer log · Open questions" title="Observations & Questions" description="A neutral record of what happened at the bench, next to the facts still needed to finish the documents.">
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Observer notes" value={formatCount(bundle.observations.length)} /><Stat label="Open questions" value={formatCount(openGapCount(bundle))} alert={openGapCount(bundle) > 0} /><Stat label="Sourced statements" value={formatPercent(bundle.session.grounding.percent)} /><Stat label="Evidence anchors" value={formatCount(bundle.evidence.length)} /></div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12"><section className="flex flex-col gap-3 xl:col-span-7"><SectionTitle title="Observer’s log" meta="Third-person notes tied to their evidence" />{bundle.observations.length ? bundle.observations.map((note) => <Surface key={note.id} className="p-5"><div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10px] text-muted"><span className="text-white">{note.timeLabel} · {note.kind}</span><span>{note.sourceLabel}</span></div><p className="text-sm leading-relaxed text-white">{note.title}</p>{note.body && <p className="mt-2 text-xs leading-relaxed text-body">{note.body}</p>}{note.media && <button onClick={() => onPhoto(note.media!.url, note.media!.caption, note.media!.meta)} className="mt-3 flex items-center gap-3 text-left"><img src={note.media.url} alt={note.media.caption ?? note.title} className="h-14 w-20 rounded object-cover" /><span className="text-xs text-body">{note.media.caption}</span></button>}<div className="mt-3"><SourceChips ids={note.evidenceId ? [note.evidenceId] : []} evidence={bundle.evidence} /></div></Surface>) : <Empty title="No observations yet" detail="Process session evidence to write a source-backed observer log." />}</section>
        <section className="flex flex-col gap-3 xl:col-span-5"><SectionTitle title="Questions · GAPS.md" meta="Human answers update the affected artifact" />{bundle.gaps.length ? bundle.gaps.map((gap) => <Surface key={gap.id} className={`p-5 ${gap.status === 'open' ? 'border-line' : 'opacity-75'}`}><div className="flex items-start gap-3"><span className="font-headline text-2xl font-light text-muted">{gap.number}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-sm leading-snug text-white">{gap.question}</h3><Pill alert={gap.status === 'open'}>{gap.status}</Pill></div><p className="mt-1 text-xs leading-relaxed text-muted">{gap.description}</p><p className="mt-2 font-mono text-[10px] text-muted">{gap.targetDoc} · {gap.priority} priority</p></div></div>{gap.status === 'open' ? <div className="mt-4 border-t border-line/60 pt-4"><div className="flex gap-2"><input value={answers[gap.id] ?? ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [gap.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && answers[gap.id]?.trim()) void resolve(gap.id, 'resolve'); }} placeholder={gap.placeholder ?? 'Type a sourced answer…'} className="min-w-0 flex-1 rounded-lg border border-line bg-surface-0 px-3 py-2 text-xs text-white outline-none placeholder:text-muted focus:border-line-strong" /><button disabled={busy === gap.id || !answers[gap.id]?.trim()} onClick={() => void resolve(gap.id, 'resolve')} className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-surface-0 disabled:opacity-40">{busy === gap.id ? 'Saving…' : 'Save'}</button></div><VoiceAnswerButton disabled={busy !== null} onTranscribe={async (file) => { setBusy(gap.id); try { await onResolveGap(gap.id, undefined, 'resolve', file); } finally { setBusy(null); } }} /><button disabled={busy === gap.id} onClick={() => void resolve(gap.id, 'defer')} className="mt-3 text-[11px] text-muted underline underline-offset-4 hover:text-white">Defer for now</button></div> : <div className="mt-4 rounded-lg bg-surface-0 p-3 text-xs text-body"><span className="text-muted">Answer: </span>{gap.resolution?.answer ?? 'Deferred'}{gap.resolution?.evidenceId && <div className="mt-2"><SourceChips ids={[gap.resolution.evidenceId]} evidence={bundle.evidence} /></div>}</div>}</Surface>) : <Empty title="No gaps flagged" detail="The pipeline did not identify any unresolved required details." />}</section></div>
    </Page>
  );
}

function BomView({ bundle, onPhoto, onResolveGap }: { bundle: SessionBundle; onPhoto: PhotoHandler; onResolveGap: (id: string, answer?: string, action?: 'resolve' | 'defer', voiceFile?: File) => Promise<void> }) {
  const total = bundle.bom.stats.totalCost;
  const unresolvedBom = bundle.gaps.filter((g) => g.status === 'open' && g.appliesTo.some((a) => a.kind === 'bom'));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const markdown = bundle.artifacts.find((a) => a.name === 'BOM.md');
  const exportCsv = () => {
    const rows = [['Component', 'Designator', 'Specification', 'Quantity', 'Unit cost', 'Status'], ...bundle.bom.items.map((i) => [i.name, i.designator, i.spec, String(i.qty), i.unitCost ? `${i.unitCost.amount} ${i.unitCost.currency}` : '', i.status])];
    downloadText('BOM.csv', rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv;charset=utf-8');
  };
  return (
    <Page kicker="Specification · Hardware audit" title="Bill of Materials & Parts" description="Components and bench tools extracted from session evidence. Costs are only displayed when pricing has an explicit source.">
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Catalogued items" value={formatCount(bundle.bom.items.length)} detail="components" /><Stat label="Verified" value={formatCount(bundle.bom.stats.verified)} detail={`${formatPercent(bundle.bom.stats.percentVerified)} spec match`} /><Stat label="Pending clarification" value={formatCount(bundle.bom.stats.needsPn)} detail="in GAPS.md" alert={bundle.bom.stats.needsPn > 0} /><Stat label="Sourced total cost" value={total ? `${total.amount.toFixed(2)} ${total.currency}` : '—'} detail={total ? 'sourced pricing' : 'no sourced pricing'} /></div>
      <div className="grid grid-cols-1 gap-7 xl:grid-cols-12"><div className="flex flex-col gap-7 xl:col-span-8"><section><SectionTitle title="Structured hardware BOM" meta={bundle.bom.revision ?? 'Current session revision'} /><Surface className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left"><thead className="bg-surface-1 font-mono text-[10px] uppercase tracking-wider text-muted"><tr>{['Component', 'Desig.', 'Specification / rating', 'Qty', 'Sources', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr></thead><tbody className="divide-y divide-line/60">{bundle.bom.items.map((item) => <tr key={item.id} className="align-top transition-colors hover:bg-surface-3/50"><td className="px-4 py-4 text-sm text-white">{item.name}</td><td className="px-4 py-4 font-mono text-xs text-muted">{item.designator}</td><td className="max-w-[300px] px-4 py-4 text-xs leading-relaxed text-body">{item.spec}</td><td className="px-4 py-4 font-mono text-xs text-white">{item.qty}</td><td className="px-4 py-4"><SourceChips ids={item.sources} evidence={bundle.evidence} /></td><td className="px-4 py-4"><Pill alert={item.status === 'needs-pn'}>{item.status}</Pill></td></tr>)}</tbody></table>{!bundle.bom.items.length && <div className="p-5"><Empty title="No components catalogued" detail="Run synthesis over session evidence to identify components." /></div>}</Surface></section>
          <section><SectionTitle title="Bench tools & test equipment" meta="Only tools mentioned or shown in evidence" />{bundle.bom.tools.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{bundle.bom.tools.map((tool) => <Surface key={tool.id} className="p-4"><div className="flex gap-3"><span className="material-symbols-outlined text-xl text-white">{tool.icon}</span><div><h3 className="text-sm text-white">{tool.name}</h3><p className="mt-1 text-xs leading-relaxed text-muted">{tool.description}</p>{tool.specs && <p className="mt-2 font-mono text-[10px] text-body">{tool.specs}</p>}<div className="mt-3"><SourceChips ids={tool.sources} evidence={bundle.evidence} /></div></div></div></Surface>)}</div> : <Empty title="No tools listed" detail="Tools will be listed when a voice note, photo, or commit identifies them." />}</section>
          <section><SectionTitle title="Provenance visual records" meta={`${bundle.evidence.filter((e) => e.photo).length} session photos`} />{bundle.evidence.filter((e) => e.photo).length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{bundle.evidence.filter((e) => e.photo).map((item) => <PhotoCard key={item.id} item={item} onClick={() => item.photo && onPhoto(item.photo.url, item.photo.caption ?? item.label, item.verification)} />)}</div> : <Empty title="No bench captures" detail="Uploaded photos appear here with their evidence links." />}</section></div>
        <aside className="flex flex-col gap-5 xl:col-span-4"><Surface className="p-5"><SectionTitle title="Unresolved BOM gaps" />{unresolvedBom.length ? unresolvedBom.map((gap) => <div key={gap.id} className="border-b border-line/60 py-3 last:border-0"><Pill alert>GAP {gap.number} · {gap.priority}</Pill><p className="mt-2 text-sm text-white">{gap.question}</p><div className="mt-3 flex gap-2"><input value={answers[gap.id] ?? ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [gap.id]: e.target.value }))} placeholder={gap.placeholder ?? 'Answer…'} className="min-w-0 flex-1 rounded border border-line bg-surface-0 px-2.5 py-2 text-xs text-white outline-none placeholder:text-muted focus:border-line-strong" /><button disabled={!answers[gap.id]?.trim()} onClick={() => void onResolveGap(gap.id, answers[gap.id])} className="rounded bg-white px-3 text-xs font-medium text-surface-0 disabled:opacity-40">Save</button></div></div>) : <p className="text-xs text-muted">No open BOM questions.</p>}</Surface><Surface className="p-5"><SectionTitle title="Export options" meta="Generated from current structured data" /><div className="flex flex-col gap-2"><button onClick={() => markdown && void api.artifact(bundle.session.id, markdown.name).then((text) => downloadText('BOM.md', text, 'text/markdown;charset=utf-8'))} className="flex items-center justify-between rounded-lg bg-surface-0 p-3 text-xs text-white hover:bg-surface-3"><span><span className="material-symbols-outlined mr-2 align-middle text-base">article</span>Export BOM.md</span><span className="text-muted">download</span></button><button onClick={exportCsv} className="flex items-center justify-between rounded-lg bg-surface-0 p-3 text-xs text-white hover:bg-surface-3"><span><span className="material-symbols-outlined mr-2 align-middle text-base">table_chart</span>Export CSV</span><span className="text-muted">Digi-Key / Mouser</span></button><button onClick={() => markdown && void api.artifact(bundle.session.id, markdown.name).then((text) => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }))} className="flex items-center justify-between rounded-lg bg-surface-0 p-3 text-xs text-white hover:bg-surface-3"><span><span className="material-symbols-outlined mr-2 align-middle text-base">content_copy</span>Copy markdown</span><span className="text-muted">{copied ? 'Copied' : 'clipboard'}</span></button></div></Surface></aside></div>
    </Page>
  );
}

function Troubleshooting({ bundle, onPhoto }: { bundle: SessionBundle; onPhoto: PhotoHandler }) {
  const resolved = bundle.incidents.filter((i) => i.status === 'resolved').length;
  return <Page kicker="Incident log · Bench root cause" title="Troubleshooting Log" description="Anomalies, symptoms, measurements, attempted fixes, and verification — each statement linked to the evidence that supports it.">
    <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Incidents recorded" value={formatCount(bundle.incidents.length)} /><Stat label="Root causes identified" value={formatCount(bundle.incidents.filter((i) => i.rootCause).length)} /><Stat label="Verified resolutions" value={formatCount(resolved)} /><Stat label="Open bench faults" value={formatCount(bundle.incidents.length - resolved)} alert={bundle.incidents.length > resolved} /></div>
    {bundle.incidents.length ? <div className="space-y-6">{bundle.incidents.map((incident) => <Surface key={incident.id} className="overflow-hidden"><div className="border-b border-line bg-surface-1 p-5 sm:p-7"><div className="mb-3 flex flex-wrap items-center gap-2"><Pill>Incident {incident.number}</Pill><Pill>{incident.level}</Pill><Pill alert={incident.status === 'open'}>{incident.status}</Pill></div><h2 className="font-headline text-xl font-light text-white sm:text-2xl">{incident.title}</h2><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] text-muted"><span>Detected · {formatClock(incident.detectedAt)}</span>{incident.resolvedAt && <span>Resolved · {formatClock(incident.resolvedAt)}</span>}{incident.telemetryTarget && <span>Target · {incident.telemetryTarget}</span>}</div></div><div className="grid grid-cols-1 gap-7 p-5 sm:p-7 lg:grid-cols-12"><div className="space-y-5 lg:col-span-8"><FactBlock label="Symptom" text={incident.symptom} sources={incident.sources} evidence={bundle.evidence} /><FactBlock label="Root cause" text={incident.rootCause} sources={incident.sources} evidence={bundle.evidence} /><FactBlock label="Fix" text={incident.fix} sources={incident.sources} evidence={bundle.evidence} />{incident.verification && <FactBlock label="Verification" text={incident.verification} sources={incident.sources} evidence={bundle.evidence} />}{incident.measurements.length > 0 && <div><h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Measurements</h3><div className="grid gap-2 sm:grid-cols-2">{incident.measurements.map((m, i) => <div key={`${m.label}-${i}`} className="rounded-lg bg-surface-0 p-3"><div className="text-xs text-muted">{m.label}</div><strong className="mt-1 block font-mono text-lg font-normal text-white">{m.value}</strong><div className="mt-2"><SourceChips ids={m.sources} evidence={bundle.evidence} /></div></div>)}</div></div>}{incident.rulesLearned.length > 0 && <div><h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Bench rules learned</h3>{incident.rulesLearned.map((rule) => <div key={rule.title} className="mb-2 rounded-lg border border-line bg-surface-0 p-3"><div className="text-sm text-white">{rule.title}</div><p className="mt-1 text-xs leading-relaxed text-body">{rule.body}</p><div className="mt-2"><SourceChips ids={rule.sources} evidence={bundle.evidence} /></div></div>)}</div>}</div><aside className="lg:col-span-4">{incident.mediaUrl && <button onClick={() => onPhoto(incident.mediaUrl!, incident.mediaCaption ?? incident.title)} className="block w-full overflow-hidden rounded-lg border border-line"><img src={incident.mediaUrl} alt={incident.mediaCaption ?? incident.title} className="w-full object-cover" /><span className="block p-2 text-left text-[10px] text-muted">{incident.mediaCaption}</span></button>}<div className="mt-4 rounded-lg bg-surface-0 p-4"><div className="mb-2 text-[10px] uppercase tracking-widest text-muted">Related commits</div>{incident.relatedCommits.length ? incident.relatedCommits.map((id) => <div key={id} className="font-mono text-xs text-white">{bundle.evidence.find((e) => e.id === id)?.sourceTag ?? id}</div>) : <span className="text-xs text-muted">No linked commits</span>}</div><div className="mt-4"><SourceChips ids={incident.sources} evidence={bundle.evidence} /></div></aside></div></Surface>)}</div> : <Empty title="No incidents recorded" detail="Troubleshooting will appear when the session evidence establishes an anomaly." />}
  </Page>;
}

function FinishedDocs({ bundle, onSelectView, onExport }: { bundle: SessionBundle; onSelectView: (v: ActiveView) => void; onExport: () => void }) {
  const docs = bundle.artifacts.filter((a) => a.kind === 'markdown' || a.kind === 'mermaid');
  const [selected, setSelected] = useState(docs.find((a) => a.name === 'README.md')?.name ?? docs[0]?.name ?? '');
  const artifact = docs.find((a) => a.name === selected) ?? docs[0];
  const open = (item: Artifact) => onSelectView(item.targetView as ActiveView);
  return <Page kicker={`Generated bundle · ${docs.length} documents and diagrams`} title="Finished Documentation" description={`Generated from ${bundle.session.counts.voice} voice segments, ${bundle.session.counts.photo} bench photos and ${bundle.session.counts.commit} commits. Every factual claim is source-linked.`} right={<button onClick={onExport} className="rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-surface-0 hover:bg-ink-hover"><span className="material-symbols-outlined mr-1 align-middle text-base">download</span>Download bundle (.zip)</button>}>
    {docs.length ? <><div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">{docs.map((doc) => <button key={doc.id} onClick={() => setSelected(doc.name)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs transition-colors ${artifact?.name === doc.name ? 'border-white bg-white text-surface-0' : 'border-line bg-surface-2 text-muted hover:text-white'}`}>{doc.name}</button>)}</div><div className="grid grid-cols-1 gap-6 xl:grid-cols-12"><Surface className="min-h-[500px] p-5 sm:p-8 xl:col-span-8"><div className="mb-5 flex items-center justify-between border-b border-line/50 pb-3"><span className="font-mono text-[10px] text-muted">DOCS // {artifact?.name.toUpperCase()}</span><Pill>{artifact?.statusLabel}</Pill></div>{artifact && <DocumentPreview key={artifact.name} bundle={bundle} artifact={artifact} />}</Surface><aside className="flex flex-col gap-5 xl:col-span-4"><Surface className="p-5"><SectionTitle title="Evidence verification" /><div className="mb-3 font-headline text-3xl font-light text-white">{formatPercent(bundle.session.grounding.percent)}</div><p className="text-xs leading-relaxed text-muted">of structured statements cite one or more evidence anchors. Unsupported specifications stay in GAPS.md.</p><div className="mt-4 flex flex-wrap gap-2">{bundle.evidence.filter((e) => e.kind === 'voice').length > 0 && <Pill>{bundle.session.counts.voice} voice segments</Pill>}{bundle.session.counts.photo > 0 && <Pill>{bundle.session.counts.photo} photos</Pill>}{bundle.session.counts.commit > 0 && <Pill>{bundle.session.counts.commit} commits</Pill>}</div></Surface><Surface className="p-5"><SectionTitle title="Open in workspace" />{docs.map((item) => <button key={item.id} onClick={() => open(item)} className="flex w-full items-center justify-between border-b border-line/50 py-3 text-left text-xs text-body last:border-0 hover:text-white"><span>{item.name}</span><span className="material-symbols-outlined text-sm">arrow_outward</span></button>)}</Surface></aside></div></> : <Empty title="No documentation yet" detail="Process captured evidence to generate README, BOM, gaps, observer notes and diagrams." />}
  </Page>;
}

function DocumentPreview({ bundle, artifact, compact = false }: { bundle: SessionBundle; artifact: Artifact; compact?: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void api.artifact(bundle.session.id, artifact.name).then((value) => { if (active) { setText(value); setError(null); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load artifact.'); });
    return () => { active = false; };
  }, [artifact.name, bundle.session.id]);

  if (error) return <p className="text-xs text-muted">{error}</p>;
  if (artifact.kind === 'mermaid') {
    const diagram = bundle.hardware.diagrams.find((d) => d.filename === artifact.name.split('/').at(-1));
    return <MermaidDiagram source={diagram?.mmd ?? text} className={compact ? 'max-h-72' : 'min-h-[350px]'} />;
  }
  if (!text) return <p className="text-xs text-muted">Loading artifact…</p>;
  return <article className={`prose prose-invert max-w-none ${compact ? 'max-h-72 overflow-hidden' : ''}`}>
    <MarkdownText text={text} bundle={bundle} />
  </article>;
}

function MarkdownText({ text, bundle }: { text: string; bundle: SessionBundle }) {
  const lines = text.split('\n');
  return <div className="space-y-2 text-sm leading-relaxed text-body">{lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1" />;
    if (line.startsWith('# ')) return <h2 key={i} className="mb-3 font-headline text-2xl font-light text-white">{line.slice(2)}</h2>;
    if (line.startsWith('## ')) return <h3 key={i} className="mb-2 mt-5 font-headline text-lg font-normal text-white">{line.slice(3)}</h3>;
    if (line.startsWith('### ')) return <h4 key={i} className="mt-4 font-headline text-base text-white">{line.slice(4)}</h4>;
    if (line.startsWith('> ')) return <p key={i} className="border-l border-line-strong pl-3 text-xs text-muted">{line.slice(2)}</p>;
    if (line.startsWith('|')) return <pre key={i} className="overflow-x-auto rounded bg-surface-0 px-3 py-1 font-mono text-[10px] text-body">{line}</pre>;
    if (line.startsWith('- ')) return <p key={i} className="pl-3 text-xs before:mr-2 before:text-muted before:content-['•']">{renderCitations(line.slice(2), bundle)}</p>;
    if (line.startsWith('```')) return null;
    return <p key={i} className="text-sm">{renderCitations(line, bundle)}</p>;
  })}</div>;
}

function renderCitations(line: string, bundle: SessionBundle) {
  const parts = line.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => part.startsWith('[') && part.endsWith(']') ? <span key={i} className="mx-0.5 rounded bg-surface-3 px-1 py-0.5 font-mono text-[10px] text-white" title={bundle.evidence.find((e) => e.sourceTag === part.slice(1, -1))?.verification}>{part}</span> : part.replace(/\*\*/g, '').replace(/`/g, ''));
}

function PhotoCard({ item, onClick }: { item: EvidenceItem; onClick: () => void }) {
  return <button onClick={onClick} className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-surface-2 text-left"><img src={item.photo?.url} alt={item.photo?.caption ?? item.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-3"><div className="font-mono text-[10px] text-white">{item.sourceTag} · {formatClock(item.instant)}</div><div className="mt-1 text-xs text-white">{item.photo?.caption ?? item.label}</div></div><span className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"><span className="material-symbols-outlined text-sm">zoom_in</span></span></button>;
}

function SummaryRows({ bundle }: { bundle: SessionBundle }) {
  const rows = [
    ['mic', 'Voice segments', bundle.session.counts.voice],
    ['photo_camera', 'Bench photos', bundle.session.counts.photo],
    ['terminal', 'Git commits', bundle.session.counts.commit],
    ['speed', 'Measurements', bundle.session.counts.measurement],
  ] as const;
  return <div className="space-y-3">{rows.map(([icon, label, count]) => <div key={label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-body"><span className="material-symbols-outlined text-base text-muted">{icon}</span>{label}</span><span className="font-mono text-white">{count}</span></div>)}</div>;
}

function NodeSummary({ node }: { node?: SessionBundle['ideas']['nodes'][number] }) {
  return <div className="rounded-lg border border-line bg-surface-0 p-3"><div className="font-mono text-[10px] uppercase tracking-widest text-muted">{node?.kind ?? 'idea'}</div><div className="mt-1 text-sm text-white">{node?.label ?? 'Missing node'}</div></div>;
}

function FactBlock({ label, text, sources, evidence }: { label: string; text: string; sources: string[]; evidence: EvidenceItem[] }) {
  return <div><h3 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">{label}</h3><p className="text-sm leading-relaxed text-white">{text}</p><div className="mt-2"><SourceChips ids={sources} evidence={evidence} /></div></div>;
}

function QuickLink({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-3 text-left text-xs text-body transition-colors hover:border-line-strong hover:text-white"><span className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-muted">{icon}</span>{label}</span><span className="material-symbols-outlined text-sm text-muted">arrow_forward</span></button>;
}

function VoiceAnswerButton({ disabled, onTranscribe }: { disabled: boolean; onTranscribe: (file: File) => Promise<void> }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  useEffect(() => () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const toggle = async () => {
    setError(null);
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      stream.current = audioStream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const active = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
      recorder.current = active;
      chunks.current = [];
      active.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      active.onerror = () => setError('The browser could not record this answer.');
      active.onstop = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setRecording(false);
        const blob = new Blob(chunks.current, { type: active.mimeType || 'audio/webm' });
        chunks.current = [];
        if (!blob.size) return;
        const extension = blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `gap-answer.${extension}`, { type: blob.type });
        setUploading(true);
        void onTranscribe(file).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not transcribe the spoken answer.')).finally(() => setUploading(false));
      };
      active.start(250);
      setRecording(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Microphone permission was denied.');
    }
  };

  return <div className="mt-2"><button disabled={disabled || uploading} onClick={() => void toggle()} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors disabled:opacity-50 ${recording ? 'border-alert/40 bg-alert-deep/20 text-alert' : 'border-line-strong bg-surface-0 text-body hover:text-white'}`}><span className={`material-symbols-outlined text-sm ${recording ? 'animate-pulse' : ''}`}>{uploading ? 'progress_activity' : recording ? 'stop_circle' : 'mic'}</span>{uploading ? 'Transcribing spoken answer…' : recording ? 'Stop and submit' : 'Record spoken answer'}</button>{error && <p className="mt-2 text-[10px] text-alert">{error}</p>}</div>;
}

function artifactIcon(artifact: Artifact) {
  if (artifact.kind === 'mermaid') return 'schema';
  if (artifact.name === 'BOM.md') return 'inventory_2';
  if (artifact.name === 'GAPS.md') return 'help_outline';
  if (artifact.name === 'TROUBLESHOOTING.md') return 'build_circle';
  if (artifact.name === 'OBSERVER_NOTES.md') return 'visibility';
  return 'description';
}

function openGapCount(bundle: SessionBundle) {
  return bundle.gaps.filter((gap) => gap.status === 'open').length;
}
