/**
 * Filesystem session store.
 *
 * One directory per session under `DATA_DIR/sessions`. Raw provider output is
 * immutable and append-only; derived state is rewritten whole. Every read is
 * schema-validated, and a corrupt or absent file degrades to its empty value
 * with a warning rather than taking the server down.
 *
 * Fixture sessions are materialized into the data directory on first access so
 * that mock mode exercises exactly the same code paths as a real session,
 * including writes.
 */
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import type { ZodType } from 'zod';
import { config } from '../config';
import { computeBomStats, computeCounts, computeGrounding } from '../lib/derive';
import { evidenceWindow } from '../../shared/timeline';
import {
  ArtifactSchema,
  BomSchema,
  ChronologySchema,
  EvidenceListSchema,
  GapItemSchema,
  HardwareGraphSchema,
  IdeaGraphSchema,
  IncidentSchema,
  ObservationNoteSchema,
  RunSchema,
  SessionSchema,
  TranscriptSchema,
} from '../../shared/schema/index';
import type {
  Artifact,
  Bom,
  Chronology,
  EvidenceItem,
  GapItem,
  HardwareGraph,
  IdeaGraph,
  Incident,
  ObservationNote,
  Run,
  Session,
  SessionBundle,
  Sources,
  Transcript,
} from '../../shared/schema/index';
import {
  EMPTY_COUNTS,
  EMPTY_GROUNDING,
  emptyBom,
  emptyChronology,
  emptyHardwareGraph,
  emptyIdeaGraph,
  emptyTranscript,
} from './empty';

export const FILES = {
  session: 'session.json',
  evidence: 'evidence.json',
  transcript: 'transcript.json',
  chronology: 'chronology.json',
  ideasGraph: 'ideas/graph.json',
  ideasHistory: 'ideas/history.jsonl',
  hardwareGraph: 'hardware/graph.json',
  bom: 'bom.json',
  gaps: 'gaps.json',
  incidents: 'incidents.json',
  observations: 'observations.json',
  readmeProse: 'readme-prose.json',
  run: 'run.json',
  runs: 'runs.jsonl',
  liveRaw: 'raw/live.jsonl',
} as const;

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

/** Unique temp suffix so concurrent writers to the same path cannot collide. */
let tmpCounter = 0;
function tmpName(target: string): string {
  tmpCounter += 1;
  return `${target}.${process.pid}.${tmpCounter}.tmp`;
}

/* -------------------------------------------------------------------------- */
/* Paths                                                                       */
/* -------------------------------------------------------------------------- */

export interface SessionPaths {
  id: string;
  dir: string;
  capture: string;
  audio: string;
  photos: string;
  raw: string;
  stt: string;
  ideas: string;
  hardware: string;
  diagrams: string;
  artifacts: string;
}

export function pathsFor(sessionId: string): SessionPaths {
  const dir = path.join(config.sessionsDir, sessionId);
  return {
    id: sessionId,
    dir,
    capture: path.join(dir, 'capture'),
    audio: path.join(dir, 'capture', 'audio'),
    photos: path.join(dir, 'capture', 'photos'),
    raw: path.join(dir, 'raw'),
    stt: path.join(dir, 'raw', 'stt'),
    ideas: path.join(dir, 'ideas'),
    hardware: path.join(dir, 'hardware'),
    diagrams: path.join(dir, 'hardware', 'diagrams'),
    artifacts: path.join(dir, 'artifacts'),
  };
}

export async function ensureSessionDirs(sessionId: string): Promise<SessionPaths> {
  const paths = pathsFor(sessionId);
  await mkdir(paths.artifacts, { recursive: true });
  await mkdir(paths.audio, { recursive: true });
  await mkdir(paths.photos, { recursive: true });
  await mkdir(paths.stt, { recursive: true });
  await mkdir(paths.ideas, { recursive: true });
  await mkdir(paths.diagrams, { recursive: true });
  return paths;
}

function file(sessionId: string, rel: string): string {
  // Reject traversal: every stored path is relative and inside the session dir.
  const resolved = path.resolve(pathsFor(sessionId).dir, rel);
  if (!resolved.startsWith(path.resolve(pathsFor(sessionId).dir) + path.sep)) {
    throw new Error(`Refusing to resolve path outside session directory: ${rel}`);
  }
  return resolved;
}

/* -------------------------------------------------------------------------- */
/* Low-level I/O                                                               */
/* -------------------------------------------------------------------------- */

export async function readJson<T>(
  sessionId: string,
  rel: string,
  schema: ZodType<T>,
  fallback: T
): Promise<T> {
  const target = file(sessionId, rel);
  if (!existsSync(target)) return fallback;
  try {
    const raw = await readFile(target, 'utf8');
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn(`[store] ${sessionId}/${rel} failed validation, using defaults`);
      return fallback;
    }
    return parsed.data;
  } catch (err) {
    console.warn(`[store] could not read ${sessionId}/${rel}:`, (err as Error).message);
    return fallback;
  }
}

export async function writeJson(sessionId: string, rel: string, value: unknown): Promise<void> {
  const target = file(sessionId, rel);
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = tmpName(target);
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, target);
}

export async function writeText(sessionId: string, rel: string, text: string): Promise<void> {
  const target = file(sessionId, rel);
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = tmpName(target);
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, target);
}

/** Append-only. Prior lines are never rewritten. */
export async function appendJsonl(
  sessionId: string,
  rel: string,
  values: readonly unknown[]
): Promise<void> {
  if (values.length === 0) return;
  const target = file(sessionId, rel);
  await mkdir(path.dirname(target), { recursive: true });
  const chunk = values.map((v) => JSON.stringify(v)).join('\n') + '\n';
  await appendFile(target, chunk, 'utf8');
}

export async function readJsonl<T>(
  sessionId: string,
  rel: string,
  schema: ZodType<T>
): Promise<T[]> {
  const target = file(sessionId, rel);
  if (!existsSync(target)) return [];
  const raw = await readFile(target, 'utf8');
  const out: T[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = schema.safeParse(JSON.parse(line));
      if (parsed.success) out.push(parsed.data);
      else console.warn(`[store] skipping invalid line in ${sessionId}/${rel}`);
    } catch {
      console.warn(`[store] skipping unparseable line in ${sessionId}/${rel}`);
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

async function listFixtureIds(): Promise<string[]> {
  if (!existsSync(config.fixturesDir)) return [];
  const entries = await readdir(config.fixturesDir, { withFileTypes: true });
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (existsSync(path.join(config.fixturesDir, entry.name, 'session.json'))) {
      ids.push(entry.name);
    }
  }
  return ids;
}

/**
 * Copy a fixture into the data directory so mock sessions are writable.
 * Returns true when a copy happened.
 */
export async function materializeFixture(sessionId: string): Promise<boolean> {
  const dest = pathsFor(sessionId).dir;
  if (existsSync(dest)) return false;
  const src = path.join(config.fixturesDir, sessionId);
  if (!existsSync(src)) return false;
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(src, dest, { recursive: true });
  return true;
}

async function listRealSessionIds(): Promise<string[]> {
  if (!existsSync(config.sessionsDir)) return [];
  const entries = await readdir(config.sessionsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && existsSync(path.join(config.sessionsDir, e.name, 'session.json')))
    .map((e) => e.name);
}

export async function listSessions(): Promise<Session[]> {
  const realIds = await listRealSessionIds();
  const fixtureIds = await listFixtureIds();
  const seen = new Set(realIds);
  const all = [...realIds, ...fixtureIds.filter((id) => !seen.has(id))];

  const sessions: Session[] = [];
  for (const id of all) {
    const isReal = seen.has(id);
    const dir = isReal ? pathsFor(id).dir : path.join(config.fixturesDir, id);
    try {
      const raw = await readFile(path.join(dir, 'session.json'), 'utf8');
      const parsed = SessionSchema.safeParse(JSON.parse(raw));
      if (parsed.success) sessions.push(parsed.data);
      else console.warn(`[store] ${id}/session.json failed validation`);
    } catch (err) {
      console.warn(`[store] could not read ${id}/session.json:`, (err as Error).message);
    }
  }

  return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* -------------------------------------------------------------------------- */
/* Session lifecycle                                                           */
/* -------------------------------------------------------------------------- */

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'session'
  );
}

export async function createSession(input: {
  name?: string;
  mode: 'batch' | 'live';
  repoPath?: string;
}): Promise<Session> {
  const id = nanoid();
  const name = input.name?.trim() || `Session ${new Date().toISOString().slice(0, 10)}`;
  const now = new Date().toISOString();
  const session: Session = {
    id,
    name,
    slug: slugify(name),
    mode: input.mode,
    status: 'draft',
    createdAt: now,
    startedAt: null,
    endedAt: null,
    durationSec: null,
    repoPath: input.repoPath?.trim() || null,
    repoBranch: null,
    headCommit: null,
    mock: config.mock,
    counts: EMPTY_COUNTS,
    grounding: EMPTY_GROUNDING,
    error: null,
  };

  await ensureSessionDirs(id);
  await writeJson(id, FILES.session, session);
  await writeJson(id, FILES.evidence, []);
  await writeJson(id, FILES.gaps, []);
  await writeJson(id, FILES.incidents, []);
  await writeJson(id, FILES.observations, []);
  await writeJson(id, FILES.bom, emptyBom());
  await writeJson(id, FILES.chronology, emptyChronology());
  await writeJson(id, FILES.ideasGraph, emptyIdeaGraph());
  await writeJson(id, FILES.hardwareGraph, emptyHardwareGraph());
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  await materializeFixture(sessionId);
  if (!existsSync(file(sessionId, FILES.session))) return null;
  return readJson<Session | null>(sessionId, FILES.session, SessionSchema.nullable(), null);
}

export async function saveSession(session: Session): Promise<void> {
  await writeJson(session.id, FILES.session, session);
}

export async function patchSession(
  sessionId: string,
  patch: { name?: string; repoPath?: string | null }
): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`Unknown session ${sessionId}`);
  const next: Session = {
    ...session,
    name: patch.name?.trim() || session.name,
    slug: patch.name?.trim() ? slugify(patch.name) : session.slug,
    repoPath: patch.repoPath !== undefined ? patch.repoPath : session.repoPath,
  };
  await saveSession(next);
  return next;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const dir = pathsFor(sessionId).dir;
  if (existsSync(dir)) await rm(dir, { recursive: true, force: true });
}

/* -------------------------------------------------------------------------- */
/* Bundle                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Collect every structured statement's source list so grounding is one honest
 * number computed from the whole session.
 */
function collectStatementSources(parts: {
  evidence: EvidenceItem[];
  bom: Bom;
  hardware: HardwareGraph;
  ideas: IdeaGraph;
  observations: ObservationNote[];
  incidents: Incident[];
}): Sources[] {
  const sources: Sources[] = [];
  for (const item of parts.evidence) {
    if (item.kind === 'measurement') sources.push(item.sources);
  }
  for (const item of parts.bom.items) sources.push(item.sources);
  for (const tool of parts.bom.tools) sources.push(tool.sources);
  for (const node of parts.hardware.nodes) sources.push(node.sources);
  for (const edge of parts.hardware.edges) sources.push(edge.sources);
  for (const node of parts.ideas.nodes) sources.push(node.sources);
  for (const edge of parts.ideas.edges) sources.push(edge.sources);
  for (const link of parts.ideas.affinities) sources.push(link.sources);
  for (const incident of parts.incidents) {
    sources.push(incident.sources);
    for (const m of incident.measurements) sources.push(m.sources);
    for (const rule of incident.rulesLearned) sources.push(rule.sources);
  }
  for (const note of parts.observations) {
    sources.push(note.evidenceId ? [note.evidenceId] : []);
  }
  return sources;
}

export async function loadBundle(sessionId: string): Promise<SessionBundle> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`Unknown session ${sessionId}`);

  const [evidence, transcript, chronology, ideas, hardware, bomRaw, gaps, incidents, observations, artifacts, run] =
    await Promise.all([
      readJson<EvidenceItem[]>(sessionId, FILES.evidence, EvidenceListSchema, []),
      readJson<Transcript>(sessionId, FILES.transcript, TranscriptSchema, emptyTranscript()),
      readJson<Chronology>(sessionId, FILES.chronology, ChronologySchema, emptyChronology()),
      readJson<IdeaGraph>(sessionId, FILES.ideasGraph, IdeaGraphSchema, emptyIdeaGraph()),
      readJson<HardwareGraph>(sessionId, FILES.hardwareGraph, HardwareGraphSchema, emptyHardwareGraph()),
      readJson<Bom>(sessionId, FILES.bom, BomSchema, emptyBom()),
      readJson<GapItem[]>(sessionId, FILES.gaps, GapItemSchema.array(), []),
      readJson<Incident[]>(sessionId, FILES.incidents, IncidentSchema.array(), []),
      readJson<ObservationNote[]>(sessionId, FILES.observations, ObservationNoteSchema.array(), []),
      readJson<Artifact[]>(sessionId, 'artifacts/index.json', ArtifactSchema.array(), []),
      readJson<Run | null>(sessionId, FILES.run, RunSchema.nullable(), null),
    ]);

  const bom: Bom = { ...bomRaw, stats: computeBomStats(bomRaw.items) };
  const counts = computeCounts(evidence);
  const grounding = computeGrounding(
    collectStatementSources({ evidence, bom, hardware, ideas, observations, incidents })
  );

  const window = evidenceWindow(evidence);
  const durationSec =
    session.mode === 'live' && session.startedAt
      ? Math.round(
          ((session.endedAt ? Date.parse(session.endedAt) : Date.now()) -
            Date.parse(session.startedAt)) /
            1000
        )
      : (window?.durationSec ?? session.durationSec);

  const derived: Session = {
    ...session,
    counts,
    grounding,
    durationSec: Number.isFinite(durationSec as number) ? durationSec : null,
    startedAt: session.startedAt ?? window?.start ?? null,
    endedAt: session.endedAt ?? window?.end ?? null,
  };

  return {
    session: derived,
    evidence,
    transcript: transcript.provider === 'none' && transcript.segments.length === 0 ? null : transcript,
    chronology,
    ideas,
    hardware,
    bom,
    gaps,
    incidents,
    observations,
    artifacts,
    run,
  };
}

/* -------------------------------------------------------------------------- */
/* Artifacts and media                                                         */
/* -------------------------------------------------------------------------- */

const ARTIFACT_INDEX = 'artifacts/index.json';

export async function readArtifacts(sessionId: string): Promise<Artifact[]> {
  return readJson<Artifact[]>(sessionId, ARTIFACT_INDEX, ArtifactSchema.array(), []);
}

export async function writeArtifacts(sessionId: string, artifacts: Artifact[]): Promise<void> {
  await writeJson(sessionId, ARTIFACT_INDEX, artifacts);
}

export async function statArtifact(
  sessionId: string,
  relPath: string
): Promise<{ bytes: number; hash: string } | null> {
  try {
    const target = file(sessionId, relPath);
    const info = await stat(target);
    const { createHash } = await import('node:crypto');
    const content = await readFile(target);
    return { bytes: info.size, hash: createHash('sha256').update(content).digest('hex').slice(0, 12) };
  } catch {
    return null;
  }
}

export interface ResolvedFile {
  absolute: string;
  rel: string;
}

/** Resolve an artifact name like `diagrams/system.mmd` inside the session dir. */
export function resolveArtifactPath(sessionId: string, name: string): ResolvedFile {
  const clean = name.replace(/^\/+/, '');
  const absolute = file(sessionId, path.join('artifacts', clean));
  return { absolute, rel: path.join('artifacts', clean) };
}

const MEDIA_DIRS = ['capture/photos', 'capture/audio'] as const;

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
  '.md': 'text/markdown; charset=utf-8',
  '.mmd': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
};

export function contentTypeFor(filename: string): string {
  return CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

/** Find a stored capture file by media id (`photo-1`, `audio-2`, …). */
export async function resolveMedia(
  sessionId: string,
  mediaId: string
): Promise<{ absolute: string; contentType: string } | null> {
  const safe = mediaId.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe) return null;
  for (const dir of MEDIA_DIRS) {
    const base = path.join(pathsFor(sessionId).dir, dir);
    if (!existsSync(base)) continue;
    const entries = await readdir(base);
    const match = entries.find((name) => name === safe || name.startsWith(`${safe}.`));
    if (match) {
      return {
        absolute: path.join(base, match),
        contentType: contentTypeFor(match),
      };
    }
  }
  return null;
}

export async function listArtifactFiles(sessionId: string): Promise<string[]> {
  const base = path.join(pathsFor(sessionId).dir, 'artifacts');
  if (!existsSync(base)) return [];
  const out: string[] = [];
  const walk = async (dir: string, prefix: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
      else if (entry.name !== 'index.json') out.push(rel);
    }
  };
  await walk(base, '');
  return out.sort();
}
