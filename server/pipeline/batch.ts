/**
 * Batch pipeline: one pass over a finished capture directory.
 *
 * Stages run in order and each reports through the run event stream, so the UI
 * shows progress while it happens. A synthesis step that fails is reported, its
 * output omitted, and a gap question filed — the run still completes with
 * whatever could be grounded.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type {
  Bom,
  Chronology,
  EvidenceItem,
  GapItem,
  HardwareGraph,
  IdeaGraph,
  Incident,
  ObservationNote,
  Transcript,
} from '../../shared/schema/index';
import {
  EvidenceListSchema,
  HardwareGraphSchema,
  TranscriptSchema,
} from '../../shared/schema/index';
import { formatClock } from '../../shared/format';
import { evidenceWindow, sortTimeable } from '../../shared/timeline';
import { config } from '../config';
import { HttpError } from '../lib/errors';
import { emit, finishRun, setStage, startRun } from '../lib/runs';
import { regenerateArtifacts } from '../lib/artifacts';
import {
  FILES,
  ensureSessionDirs,
  loadBundle,
  readJson,
  saveSession,
  writeJson,
} from '../store/sessionStore';
import { isGitRepo, readCommits, type GitRepoInfo } from '../providers/git';
import { readKeyterms, transcribeSession } from '../providers/elevenlabs';
import type { ImageInput } from '../providers/gemini';
import { buildEvidence } from './timeline';
import {
  buildTagIndex,
  mergeIdeaGraphs,
  normalizeHardware,
  normalizeIdeas,
  providerLabel,
  resolveSources,
  synthesizeBom,
  synthesizeChronology,
  synthesizeGaps,
  synthesizeHardware,
  synthesizeIdeas,
  synthesizeIncidents,
  synthesizeObservations,
  synthesizeReadmeProse,
  type NormalizeReport,
  type ReadmeProseOutput,
  type SynthesisContext,
  type TagIndex,
} from './synthesize';
import {
  checkDiagrams,
  checkObservations,
  checkSources,
  evidenceIdSet,
  summarize,
  type ValidationIssue,
} from './validate';

const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.aac', '.opus']);
const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const PHOTO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export interface BatchOptions {
  synthesizeOnly?: boolean;
}

export async function runBatchPipeline(
  sessionId: string,
  options: BatchOptions = {}
): Promise<string> {
  const run = await startRun(sessionId, 'batch');

  void (async () => {
    try {
      await execute(sessionId, options);
      await finishRun(sessionId, 'completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pipeline failed.';
      try {
        const bundle = await loadBundle(sessionId);
        bundle.session.status = 'failed';
        bundle.session.error = message;
        await saveSession(bundle.session);
      } catch {
        /* session unreadable; nothing left to mark */
      }
      await finishRun(sessionId, 'failed', message);
    }
  })();

  return run.id;
}

/* -------------------------------------------------------------------------- */
/* Orchestration                                                               */
/* -------------------------------------------------------------------------- */

async function execute(sessionId: string, options: BatchOptions): Promise<void> {
  const paths = await ensureSessionDirs(sessionId);
  const bundle = await loadBundle(sessionId);
  const session = { ...bundle.session, status: 'processing' as const, error: null };
  await saveSession(session);

  /* ------------------------------- ingest ------------------------------- */
  await setStage(sessionId, 'ingest', 0.05, 'Reading capture directory');

  const audioFiles = await listCapture(paths.audio, AUDIO_EXT);
  const photoFiles = await listCapture(paths.photos, PHOTO_EXT);
  const keyterms = await readKeyterms(paths.capture);

  await emit(sessionId, 'log', {
    message: `${audioFiles.length} audio file(s), ${photoFiles.length} photo(s), ${keyterms.length} keyterm(s).`,
  });

  const notesPath = path.join(paths.capture, 'notes.txt');
  if (audioFiles.length === 0 && photoFiles.length === 0 && !existsSync(notesPath) && !session.repoPath) {
    throw HttpError.unprocessable(
      'This session has no audio, no photos and no repository path. Upload a capture first.'
    );
  }

  /* ----------------------------- transcribe ----------------------------- */
  await setStage(sessionId, 'transcribe', 0.2, 'Transcribing speech');

  let transcript: Transcript;
  if (options.synthesizeOnly) {
    transcript = await readJson<Transcript>(
      sessionId,
      FILES.transcript,
      TranscriptSchema,
      emptyTranscript()
    );
    await emit(sessionId, 'log', { message: 'Reusing the stored transcript.', level: 'warn' });
  } else if (audioFiles.length > 0) {
    if (!config.elevenlabs.apiKey) {
      throw HttpError.unprocessable(
        'Audio was captured but ELEVENLABS_API_KEY is not set, so it cannot be transcribed.'
      );
    }
    transcript = await transcribeSession({
      sessionId,
      sessionDir: paths.dir,
      audioPaths: audioFiles.map((f) => ({ audioId: path.parse(f.name).name, path: f.absolute })),
      keyterms,
    });
    await writeJson(sessionId, FILES.transcript, transcript);
    await emit(sessionId, 'log', {
      message: `${transcript.segments.length} transcript segment(s)${
        transcript.wordTimingAvailable ? ' with word timing' : ' without word timing'
      }.`,
    });
  } else {
    transcript = emptyTranscript();
  }

  /* --------------------------------- git -------------------------------- */
  await setStage(sessionId, 'git', 0.42, 'Reading git history');

  let repo: GitRepoInfo | null = null;
  if (session.repoPath) {
    if (await isGitRepo(session.repoPath)) {
      const window = evidenceWindow(bundle.evidence);
      repo = await readCommits(session.repoPath, { since: window?.start ?? null, limit: 60 });
      session.repoBranch = repo.branch;
      session.headCommit = repo.head;
      await mkdir(paths.raw, { recursive: true });
      await writeFile(
        path.join(paths.raw, 'git.json'),
        JSON.stringify({ readAt: new Date().toISOString(), ...repo }, null, 2),
        'utf8'
      );
      await emit(sessionId, 'log', {
        message: `${repo.commits.length} commit(s) on ${repo.branch ?? 'HEAD'}.`,
      });
    } else {
      await emit(sessionId, 'log', {
        message: `${session.repoPath} is not a git repository; skipping commit evidence.`,
        level: 'warn',
      });
    }
  } else {
    await emit(sessionId, 'log', {
      message: 'No repository path set; skipping commit evidence.',
      level: 'warn',
    });
  }

  /* ------------------------------- timeline ----------------------------- */
  await setStage(sessionId, 'timeline', 0.55, 'Assembling timeline');

  const baseEvidence = options.synthesizeOnly
    ? bundle.evidence.filter((item) => !item.id.startsWith('ev-measure-'))
    : await buildEvidence({ paths, transcript, repo, sessionId });
  await emit(sessionId, 'evidence', { message: `${baseEvidence.length} evidence item(s) assembled.` });

  /* ------------------------------ synthesize ---------------------------- */
  await setStage(sessionId, 'synthesize', 0.62, `Synthesizing via ${providerLabel()}`);

  const images = await loadImages(photoFiles);
  const index = buildTagIndex(baseEvidence);
  const ctx: SynthesisContext = { session, evidence: baseEvidence, index, images };
  const missing: string[] = [];
  const issues: ValidationIssue[] = [];
  const report: NormalizeReport = { droppedCitations: [], droppedStatements: [] };

  const observations =
    (await attempt({
      sessionId,
      name: 'observations',
      missing,
      call: (correction) => synthesizeObservations(ctx, correction),
      normalize: (out) => toObservations(out, baseEvidence, index),
      validate: (value) => {
        const findings = [
          ...checkObservations(value),
          ...checkSources(
            value.map((n) => ({
              label: `observation ${n.id}`,
              sources: n.evidenceId ? [n.evidenceId] : [],
            })),
            evidenceIdSet(baseEvidence)
          ),
        ];
        const errors = findings.filter((issue) => issue.severity === 'error');
        if (errors.length) throw new Error(errors.map((issue) => issue.message).join(' '));
        issues.push(...findings);
      },
    })) ?? [];
  await writeJson(sessionId, FILES.observations, observations);

  const hardwareNormalized = await attempt({
    sessionId,
    name: 'hardware',
    missing,
    call: () => synthesizeHardware(ctx),
    normalize: (out) => normalizeHardware(out, index, report),
  });

  const measurementEvidence = hardwareNormalized
    ? toMeasurementEvidence(hardwareNormalized, baseEvidence)
    : [];
  const evidence = sortTimeable([...baseEvidence, ...measurementEvidence]).map((item, i) => ({
    ...item,
    order: i + 1,
  }));
  await writeJson(sessionId, FILES.evidence, evidence);

  const hardware: HardwareGraph = {
    nodes: hardwareNormalized?.nodes ?? [],
    edges: hardwareNormalized?.edges ?? [],
    diagrams: [],
  };

  const bom =
    (await attempt({
      sessionId,
      name: 'bom',
      missing,
      call: () => synthesizeBom(ctx),
      normalize: (out) => toBom(out, index, report),
    })) ?? emptyBom();
  await writeJson(sessionId, FILES.bom, bom);

  const evidenceById = new Map(evidence.map((e) => [e.id, e]));

  const incidents =
    (await attempt({
      sessionId,
      name: 'incidents',
      missing,
      call: () =>
        synthesizeIncidents(
          ctx,
          observations.map((o) => `${o.timeLabel} ${o.title}`).join('\n') || '(none)'
        ),
      normalize: (out) => toIncidents(out, evidence, index),
    })) ?? [];
  await writeJson(sessionId, FILES.incidents, incidents);

  const ideaNormalized = await attempt({
    sessionId,
    name: 'ideas',
    missing,
    call: () => synthesizeIdeas(ctx, bundle.ideas),
    normalize: (out) => normalizeIdeas(out, index, evidenceById, report),
  });
  const ideas: IdeaGraph = mergeIdeaGraphs(bundle.ideas, {
    clusters: ideaNormalized?.clusters ?? [],
    nodes: ideaNormalized?.nodes ?? [],
    edges: ideaNormalized?.edges ?? [],
    affinities: ideaNormalized?.affinities ?? [],
  });
  await writeJson(sessionId, FILES.ideasGraph, ideas);

  const chronology =
    (await attempt({
      sessionId,
      name: 'chronology',
      missing,
      call: () => synthesizeChronology(ctx),
      normalize: (out) => toChronology(out, evidence, index),
    })) ?? { phases: [], entries: [] };
  await writeJson(sessionId, FILES.chronology, chronology);

  const knownMissing = [
    ...missing.map((name) => `${name} could not be synthesized`),
    ...report.droppedStatements.map((s) => `${s} was dropped for lack of a source`),
    ...bom.items.filter((i) => i.status === 'needs-pn').map((i) => `${i.designator} ${i.name} part number`),
  ];

  const targets = buildTargetList({ bom, hardware, ideas, incidents });

  const gaps =
    (await attempt({
      sessionId,
      name: 'gaps',
      missing: [],
      call: () => synthesizeGaps(ctx, knownMissing.join('; ') || '(none reported)', targets),
      normalize: (out) => toGaps(out, { bom, hardware, ideas, incidents }),
    })) ?? [];
  await writeJson(sessionId, FILES.gaps, gaps);
  // Gap resolution links a blocking question back onto its BOM row.
  await writeJson(sessionId, FILES.bom, bom);

  if (report.droppedCitations.length > 0) {
    await emit(sessionId, 'log', {
      message: `${report.droppedCitations.length} model citation(s) did not match any evidence and were dropped.`,
      level: 'warn',
    });
  }

  /* -------------------------------- readme ------------------------------ */
  const facts = [
    `Components: ${bom.items.map((i) => `${i.designator} ${i.name}`).join(', ') || 'none'}`,
    `Hardware: ${hardware.nodes.map((n) => n.name).join(', ') || 'none'}`,
    `Incidents: ${incidents.map((i) => i.title).join('; ') || 'none'}`,
    `Open gaps: ${gaps.filter((g) => g.status === 'open').map((g) => g.question).join('; ') || 'none'}`,
  ].join('\n');

  const prose = await attempt({
    sessionId,
    name: 'readme',
    missing,
    call: (correction) => synthesizeReadmeProse(ctx, facts, correction),
    normalize: (out) => out,
    validate: (value) => validateReadmeProse(value, index),
  });

  /* ------------------------------- validate ----------------------------- */
  await setStage(sessionId, 'validate', 0.88, 'Validating claims and diagrams');

  const artifacts = await regenerateArtifacts(sessionId, prose ? { prose } : {});
  const stored = await readJson<HardwareGraph>(
    sessionId,
    FILES.hardwareGraph,
    HardwareGraphSchema,
    hardware
  );
  issues.push(...checkDiagrams(stored.diagrams));

  const summary = summarize(issues);
  await emit(sessionId, 'log', {
    message:
      summary.errors > 0
        ? `Validation: ${summary.errors} error(s), ${summary.warnings} warning(s) — ${Object.entries(
            summary.byCheck
          )
            .map(([check, count]) => `${check}×${count}`)
            .join(', ')}`
        : `Validation clean${summary.warnings > 0 ? ` (${summary.warnings} warning(s))` : ''}.`,
    level: summary.errors > 0 ? 'warn' : 'info',
  });

  /* -------------------------------- write ------------------------------- */
  await setStage(sessionId, 'write', 0.96, 'Writing artifacts');

  const window = evidenceWindow(evidence);
  await saveSession({
    ...session,
    status: 'ready',
    startedAt: session.startedAt ?? window?.start ?? null,
    endedAt: window?.end ?? new Date().toISOString(),
  });

  await emit(sessionId, 'artifact', {
    message: `${artifacts.length} artifact(s) written to the session directory.`,
  });
}

/* -------------------------------------------------------------------------- */
/* One synthesis step, isolated                                                */
/* -------------------------------------------------------------------------- */

interface AttemptInput<I, O> {
  sessionId: string;
  name: string;
  missing: string[];
  call: (correction?: string) => Promise<{ data: I; attempts: number }>;
  normalize: (input: I) => O;
  validate?: (value: O) => void;
}

async function attempt<I, O>(input: AttemptInput<I, O>): Promise<O | null> {
  try {
    let result: Awaited<ReturnType<typeof input.call>> | null = null;
    let value: O | null = null;
    let validationError: unknown;
    let correction: string | undefined;
    for (let retry = 0; retry < 2; retry += 1) {
      result = await input.call(correction);
      value = input.normalize(result.data);
      try {
        input.validate?.(value);
        validationError = null;
        break;
      } catch (cause) {
        validationError = cause;
        if (retry === 0) {
          correction = cause instanceof Error ? cause.message : 'The previous result failed local validation.';
          await emit(input.sessionId, 'log', {
            message: `${input.name} failed a local validation check; retrying once with the same evidence.`,
            level: 'warn',
          });
        }
      }
    }
    if (validationError) throw validationError;
    if (!result || value === null) throw new Error('Synthesis returned no validated result.');
    await emit(input.sessionId, 'log', {
      message: `${input.name} synthesized (${result.attempts} provider attempt${result.attempts === 1 ? '' : 's'}).`,
    });
    return value;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown failure';
    input.missing.push(input.name);
    console.warn(`[pipeline] ${input.name} synthesis failed: ${message}`);
    await emit(input.sessionId, 'log', {
      message: `${input.name} could not be synthesized — omitting it and filing a gap question.`,
      level: 'warn',
    });
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Capture helpers                                                             */
/* -------------------------------------------------------------------------- */

async function listCapture(
  dir: string,
  allowed: Set<string>
): Promise<{ name: string; absolute: string }[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries
    .filter((name) => allowed.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({ name, absolute: path.join(dir, name) }));
}

async function loadImages(photoFiles: { name: string; absolute: string }[]): Promise<ImageInput[]> {
  const images: ImageInput[] = [];
  let total = 0;
  for (const file of photoFiles) {
    if (images.length >= config.limits.maxPhotosPerCall) break;
    const mime = PHOTO_MIME[path.extname(file.name).toLowerCase()];
    if (!mime) continue;
    const data = new Uint8Array(await readFile(file.absolute));
    if (data.byteLength > config.limits.maxPhotoBytes) continue;
    if (total + data.byteLength > config.limits.maxInlinePayloadBytes) break;
    total += data.byteLength;
    images.push({ data, mimeType: mime, name: file.name });
  }
  return images;
}

function emptyTranscript(): Transcript {
  return { provider: 'none', segments: [], wordTimingAvailable: false };
}

function emptyBom(): Bom {
  return { items: [], tools: [], stats: { items: 0, verified: 0, needsPn: 0, percentVerified: 0 } };
}

function validateReadmeProse(prose: ReadmeProseOutput, index: TagIndex): void {
  const sections = [prose.standfirst, prose.overview, prose.architecture, prose.troubleshooting]
    .filter((section): section is string => Boolean(section?.trim()));
  const uncited: string[] = [];
  for (const section of sections) {
    for (const paragraph of section.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)) {
      const tags = [...paragraph.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]);
      const resolved = resolveSources(tags, index);
      if (resolved.ids.length === 0 || resolved.dropped.length > 0) uncited.push(paragraph.slice(0, 90));
    }
  }
  if (uncited.length) {
    throw new Error(`README prose contains uncited factual paragraph(s): ${uncited.join(' | ')}`);
  }
}

export async function readStoredEvidence(sessionId: string): Promise<EvidenceItem[]> {
  return readJson<EvidenceItem[]>(sessionId, FILES.evidence, EvidenceListSchema, []);
}

/* -------------------------------------------------------------------------- */
/* Model output → stored entities                                              */
/* -------------------------------------------------------------------------- */

function toObservations(
  output: {
    observations: {
      kind: ObservationNote['kind'];
      timeLabel: string;
      title: string;
      body?: string;
      tag?: string;
      sources: string[];
    }[];
  },
  evidence: readonly EvidenceItem[],
  index: TagIndex
): ObservationNote[] {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const notes: ObservationNote[] = [];

  for (const [i, raw] of output.observations.entries()) {
    const { ids } = resolveSources(raw.sources, index);
    const evidenceId = ids[0];
    const source = evidenceId ? byId.get(evidenceId) : undefined;
    notes.push({
      id: `obs-${i + 1}`,
      instant: source?.instant ?? null,
      timeLabel: raw.timeLabel?.trim() || (source ? formatClock(source.instant) : '\u2014'),
      kind: raw.kind,
      title: raw.title.trim(),
      body: raw.body?.trim() || undefined,
      tag: raw.tag?.trim() || undefined,
      sourceLabel: source?.sourceTag ?? 'unsourced',
      evidenceId,
      media: source?.photo
        ? {
            url: source.photo.url,
            caption: source.photo.caption,
            meta: source.photo.exif?.device ?? undefined,
          }
        : undefined,
      measurementId: source?.kind === 'measurement' ? source.id : undefined,
    });
  }
  return notes;
}

type MeasurementSet = ReturnType<typeof normalizeHardware>;

function toMeasurementEvidence(result: MeasurementSet, evidence: readonly EvidenceItem[]): EvidenceItem[] {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const maxOrder = evidence.reduce((max, e) => Math.max(max, e.order), 0);

  return result.measurements.map((measurement, i) => {
    const sources = result.measurementSources[i] ?? [];
    const origin = sources
      .map((id) => byId.get(id))
      .filter((value): value is EvidenceItem => value !== undefined);
    const instant = origin.find((o) => o.instant)?.instant ?? null;
    const sourceTags = origin.map((o) => o.sourceTag);
    return {
      id: `ev-measure-${i + 1}`,
      kind: 'measurement' as const,
      sourceTag: `measure ${i + 1}`,
      label: `${measurement.quantity}: ${measurement.value}${measurement.unit ?? ''}`,
      detail: measurement.instrument ? `Measured with ${measurement.instrument}` : undefined,
      instant,
      instantIsNaive: false,
      order: maxOrder + i + 1,
      sources,
      verification:
        sourceTags.length > 0
          ? `Extracted from ${sourceTags.map((t) => `[${t}]`).join(' ')}`
          : 'Extraction source unresolved',
      measurement,
    };
  });
}

function toBom(
  output: {
    items: {
      designator: string;
      name: string;
      spec: string;
      qty: number;
      status: Bom['items'][number]['status'];
      missing?: string;
      sources: string[];
    }[];
    tools: {
      code: string;
      name: string;
      description: string;
      specs?: string;
      icon?: string;
      sources: string[];
    }[];
  },
  index: TagIndex,
  report: NormalizeReport
): Bom {
  const items: Bom['items'] = [];
  for (const [i, raw] of output.items.entries()) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (ids.length === 0) {
      report.droppedStatements.push(`BOM row ${raw.designator} ${raw.name}`);
      continue;
    }
    items.push({
      id: `bom-${i + 1}`,
      designator: raw.designator.trim(),
      name: raw.name.trim(),
      spec: raw.spec.trim(),
      qty: raw.qty,
      sources: ids,
      status: raw.status,
    });
  }

  const tools: Bom['tools'] = [];
  for (const [i, raw] of output.tools.entries()) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (ids.length === 0) {
      report.droppedStatements.push(`bench tool ${raw.name}`);
      continue;
    }
    tools.push({
      id: `tool-${i + 1}`,
      code: raw.code.trim(),
      name: raw.name.trim(),
      description: raw.description.trim(),
      specs: raw.specs?.trim() || undefined,
      icon: raw.icon?.trim() || 'precision_manufacturing',
      sources: ids,
    });
  }

  return {
    items,
    tools,
    stats: { items: items.length, verified: 0, needsPn: 0, percentVerified: 0 },
  };
}

function toIncidents(
  output: {
    incidents: {
      title: string;
      level: Incident['level'];
      status: Incident['status'];
      phase?: string;
      detectedTag?: string;
      resolvedTag?: string;
      telemetryTarget?: string;
      symptom: string;
      measurements: { label: string; value: string; sources: string[] }[];
      rootCause: string;
      fix: string;
      verification?: string;
      rulesLearned: { title: string; body: string; sources: string[] }[];
      relatedCommitTags: string[];
      sources: string[];
    }[];
  },
  evidence: readonly EvidenceItem[],
  index: TagIndex
): Incident[] {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const incidents: Incident[] = [];

  for (const [i, raw] of output.incidents.entries()) {
    const { ids } = resolveSources(raw.sources, index);
    if (ids.length === 0) continue; // C1: unsourced incident is not written.

    const detectedId = raw.detectedTag ? resolveSources([raw.detectedTag], index).ids[0] : undefined;
    const resolvedId = raw.resolvedTag ? resolveSources([raw.resolvedTag], index).ids[0] : undefined;
    const primary = byId.get(ids[0]);

    incidents.push({
      id: `incident-${i + 1}`,
      number: String(i + 1).padStart(3, '0'),
      title: raw.title.trim(),
      level: raw.level,
      status: raw.status,
      phase: raw.phase?.trim() || undefined,
      detectedAt: detectedId ? (byId.get(detectedId)?.instant ?? null) : null,
      resolvedAt: resolvedId ? (byId.get(resolvedId)?.instant ?? null) : null,
      telemetryTarget: raw.telemetryTarget?.trim() || undefined,
      symptom: raw.symptom.trim(),
      measurements: raw.measurements
        .map((m) => ({ label: m.label, value: m.value, sources: resolveSources(m.sources, index).ids }))
        .filter((m) => m.sources.length > 0),
      rootCause: raw.rootCause.trim(),
      fix: raw.fix.trim(),
      verification: raw.verification?.trim() || undefined,
      rulesLearned: raw.rulesLearned
        .map((r) => ({ title: r.title, body: r.body, sources: resolveSources(r.sources, index).ids }))
        .filter((r) => r.sources.length > 0),
      relatedCommits: resolveSources(raw.relatedCommitTags, index).ids,
      sources: ids,
      mediaUrl: primary?.photo?.url,
      mediaCaption: primary?.photo?.caption,
    });
  }
  return incidents;
}

function toChronology(
  output: {
    phases: { id: string; title: string; summary?: string }[];
    entries: {
      phaseId: string;
      lane: string;
      kind: Chronology['entries'][number]['kind'];
      timeTag?: string;
      title: string;
      body?: string;
      sources: string[];
    }[];
  },
  evidence: readonly EvidenceItem[],
  index: TagIndex
): Chronology {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const phases: Chronology['phases'] = output.phases.map((p, i) => ({
    id: p.id.trim() || `phase-${i + 1}`,
    title: p.title.trim(),
    summary: p.summary?.trim() || undefined,
    startInstant: null,
    endInstant: null,
    entryIds: [] as string[],
  }));
  const phaseIds = new Set(phases.map((p) => p.id));
  const entries: Chronology['entries'] = [];

  for (const [i, raw] of output.entries.entries()) {
    const { ids } = resolveSources(raw.sources, index);
    if (ids.length === 0) continue;
    const phaseId = phaseIds.has(raw.phaseId) ? raw.phaseId : phases[0]?.id;
    if (!phaseId) continue;

    const timeId = raw.timeTag ? resolveSources([raw.timeTag], index).ids[0] : ids[0];
    const timeEvidence = timeId ? byId.get(timeId) : undefined;
    const primary = byId.get(ids[0]);
    const id = `chron-${i + 1}`;

    entries.push({
      id,
      phaseId,
      lane: raw.lane.trim() || 'bench',
      instant: timeEvidence?.instant ?? null,
      kind: raw.kind,
      title: raw.title.trim(),
      body: raw.body?.trim() || undefined,
      sources: ids,
      evidenceId: ids[0],
      mediaUrl: primary?.photo?.url,
      mediaCaption: primary?.photo?.caption,
    });
    phases.find((p) => p.id === phaseId)?.entryIds.push(id);
  }

  for (const phase of phases) {
    const instants = entries
      .filter((e) => e.phaseId === phase.id && e.instant)
      .map((e) => Date.parse(e.instant as string))
      .filter((v) => !Number.isNaN(v));
    if (instants.length > 0) {
      phase.startInstant = new Date(Math.min(...instants)).toISOString();
      phase.endInstant = new Date(Math.max(...instants)).toISOString();
    }
  }

  return { phases: phases.filter((p) => p.entryIds.length > 0), entries };
}

const GAP_TARGET_KINDS = new Set(['bom', 'hardware', 'idea', 'incident', 'artifact', 'chronology']);

interface GapTargets {
  bom: Bom;
  hardware: HardwareGraph;
  ideas: IdeaGraph;
  incidents: Incident[];
}

/**
 * The identifiers a gap question may point at, rendered for the prompt. The
 * model cites these human-readable refs; `resolveGapTarget` maps them back to
 * real ids so a hallucinated target cannot create a dangling write-back.
 */
function buildTargetList(targets: GapTargets): string {
  const lines: string[] = [];
  for (const item of targets.bom.items) {
    lines.push(`bom: ${item.designator} (${item.name}) -> ${item.id}`);
  }
  for (const node of targets.hardware.nodes) {
    lines.push(`hardware: ${node.designator ?? node.id} (${node.name}) -> ${node.id}`);
  }
  for (const node of targets.ideas.nodes) {
    lines.push(`idea: ${node.label} -> ${node.id}`);
  }
  for (const incident of targets.incidents) {
    lines.push(`incident: ${incident.number} (${incident.title}) -> ${incident.id}`);
  }
  return lines.length > 0 ? lines.join('\n') : '(none yet)';
}

function sameText(haystack: string, needle: string): boolean {
  return haystack.trim().toLowerCase() === needle.trim().toLowerCase();
}

function resolveGapTarget(
  target: { kind: string; ref: string; field?: string },
  targets: GapTargets
): GapItem['appliesTo'][number] | null {
  const ref = target.ref.trim();
  if (!ref) return null;

  switch (target.kind) {
    case 'bom': {
      const item = targets.bom.items.find(
        (i) => sameText(i.designator, ref) || sameText(i.name, ref) || sameText(i.id, ref)
      );
      return item ? { kind: 'bom', id: item.id, field: target.field } : null;
    }
    case 'hardware': {
      const node = targets.hardware.nodes.find(
        (n) =>
          sameText(n.id, ref) ||
          sameText(n.name, ref) ||
          (n.designator !== undefined && sameText(n.designator, ref))
      );
      if (node) return { kind: 'hardware', id: node.id, field: target.field };
      const edge = targets.hardware.edges.find((e) => sameText(e.id, ref));
      return edge ? { kind: 'hardware', id: edge.id, field: target.field } : null;
    }
    case 'idea': {
      const node = targets.ideas.nodes.find((n) => sameText(n.id, ref) || sameText(n.label, ref));
      return node ? { kind: 'idea', id: node.id, field: target.field } : null;
    }
    case 'incident': {
      const incident = targets.incidents.find(
        (i) => sameText(i.number, ref) || sameText(i.id, ref) || sameText(i.title, ref)
      );
      return incident ? { kind: 'incident', id: incident.id, field: target.field } : null;
    }
    case 'artifact':
    case 'chronology':
      return { kind: target.kind, id: ref, field: target.field };
    default:
      return null;
  }
}

function toGaps(
  output: {
    gaps: {
      question: string;
      description: string;
      targetDoc: string;
      priority: GapItem['priority'];
      placeholder?: string;
      appliesTo: { kind: string; ref: string; field?: string }[];
    }[];
  },
  targets: GapTargets
): GapItem[] {
  const gaps: GapItem[] = output.gaps.map((raw, i) => {
    const appliesTo = raw.appliesTo
      .filter((t) => GAP_TARGET_KINDS.has(t.kind))
      .map((t) => resolveGapTarget(t, targets))
      .filter((t): t is NonNullable<typeof t> => t !== null);

    return {
      id: `gap-${String(i + 1).padStart(2, '0')}`,
      number: String(i + 1).padStart(2, '0'),
      question: raw.question.trim(),
      description: raw.description.trim(),
      targetDoc: raw.targetDoc.trim() || 'README.md',
      priority: raw.priority,
      status: 'open' as const,
      appliesTo,
      placeholder: raw.placeholder?.trim() || undefined,
    };
  });

  // Link each write-back to the row it blocks, so the UI can show the connection.
  for (const gap of gaps) {
    for (const target of gap.appliesTo) {
      if (target.kind !== 'bom') continue;
      const item = targets.bom.items.find((i) => i.id === target.id);
      if (item && item.status === 'needs-pn') item.gapId = gap.id;
    }
  }

  return gaps;
}
