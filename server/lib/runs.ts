/**
 * Run state and event fan-out.
 *
 * A run is one pass of the pipeline over a session. Events are appended to
 * `runs.jsonl` (immutable), the current run is mirrored to `run.json`, and
 * listeners get each event as it happens so the UI can stream progress.
 */
import { customAlphabet } from 'nanoid';
import { FILES, appendJsonl, readJson, readJsonl, writeJson } from '../store/sessionStore';
import { RunEventSchema, RunSchema } from '../../shared/schema/index';
import type { Run, RunEvent, RunEventType, RunStage, RunStatus } from '../../shared/schema/index';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

type Listener = (event: RunEvent) => void;

const listeners = new Map<string, Set<Listener>>();
const activeRuns = new Map<string, Run>();

/** Serializes disk writes per session so append-only logs stay ordered. */
const writeQueues = new Map<string, Promise<void>>();

function enqueue<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(sessionId) ?? Promise.resolve();
  const next = prev.then(task, task);
  writeQueues.set(
    sessionId,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

/** Await every queued write for a session. Used before copying or shutting down. */
export async function flushWrites(sessionId: string): Promise<void> {
  const queued = writeQueues.get(sessionId);
  if (queued) await queued;
}

export function subscribe(sessionId: string, listener: Listener): () => void {
  let set = listeners.get(sessionId);
  if (!set) {
    set = new Set();
    listeners.set(sessionId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(sessionId);
  };
}

export async function loadRun(sessionId: string): Promise<Run | null> {
  const active = activeRuns.get(sessionId);
  if (active) return active;
  return readJson<Run | null>(sessionId, FILES.run, RunSchema.nullable(), null);
}

export async function loadRecentEvents(sessionId: string, limit = 200): Promise<RunEvent[]> {
  const events = await readJsonl(sessionId, FILES.runs, RunEventSchema);
  return events.slice(-limit);
}

export async function startRun(
  sessionId: string,
  mode: 'batch' | 'live-incremental'
): Promise<Run> {
  await flushWrites(sessionId);
  const run: Run = {
    id: nanoid(),
    sessionId,
    mode,
    status: 'running',
    stage: 'queued',
    progress: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    events: [],
  };
  activeRuns.set(sessionId, run);
  await persist(run);
  return run;
}

export async function emit(
  sessionId: string,
  type: RunEventType,
  fields: Partial<Omit<RunEvent, 'id' | 'at' | 'type'>> = {}
): Promise<RunEvent | null> {
  const run = activeRuns.get(sessionId);
  const event: RunEvent = {
    id: nanoid(),
    at: new Date().toISOString(),
    type,
    ...fields,
    level: fields.level ?? 'info',
  };

  if (run) {
    run.events = [...run.events, event].slice(-200);
    if (event.stage) run.stage = event.stage;
    if (typeof event.progress === 'number') run.progress = event.progress;
    void persist(run);
  }

  void enqueue(sessionId, () => appendJsonl(sessionId, FILES.runs, [event]));

  for (const listener of listeners.get(sessionId) ?? []) {
    try {
      listener(event);
    } catch (err) {
      console.warn('[runs] listener failed:', (err as Error).message);
    }
  }
  return run ? event : null;
}

export async function setStage(
  sessionId: string,
  stage: RunStage,
  progress: number,
  message?: string
): Promise<void> {
  await emit(sessionId, 'stage', { stage, progress, message });
}

export async function finishRun(
  sessionId: string,
  status: RunStatus,
  error: string | null = null
): Promise<void> {
  const run = activeRuns.get(sessionId);
  if (!run) return;
  run.status = status;
  run.error = error;
  run.finishedAt = new Date().toISOString();
  if (status === 'completed') {
    run.stage = 'done';
    run.progress = 1;
  }
  await emit(sessionId, status === 'completed' ? 'done' : 'error', {
    stage: run.stage,
    progress: run.progress,
    message: error ?? 'Run complete.',
    level: status === 'completed' ? 'info' : 'error',
  });
  await persist(run);
  activeRuns.delete(sessionId);
}

/** Serialized so concurrent emits cannot interleave writes to run.json. */
function persist(run: Run): Promise<void> {
  return enqueue(run.sessionId, () => writeJson(run.sessionId, FILES.run, run));
}
