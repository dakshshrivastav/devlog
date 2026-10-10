/** Live Scribe Realtime token and append-only transcript event ingestion. */
import { Router, type Request, type Response } from 'express';
import { customAlphabet } from 'nanoid';
import type { EvidenceItem, Transcript, TranscriptSegment, Word } from '../../shared/schema/index';
import { LiveEventBatchSchema, TranscriptSchema } from '../../shared/schema/index';
import { formatClock } from '../../shared/format';
import { HttpError } from '../lib/errors';
import { emit, finishRun } from '../lib/runs';
import { mintRealtimeToken, normalizeKeyterms, readKeyterms } from '../providers/elevenlabs';
import { runPipeline } from '../pipeline';
import { flushLiveIdeaSynthesis, scheduleLiveIdeaSynthesis } from '../pipeline/liveIdeas';
import { FILES, appendJsonl, getSession, loadBundle, pathsFor, readJson, saveSession, writeJson } from '../store/sessionStore';

export const liveRouter = Router({ mergeParams: true });
const shortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 7);
const locks = new Map<string, Promise<void>>();

async function serialized<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  locks.set(sessionId, previous.then(() => current));
  await previous;
  try { return await task(); }
  finally { release(); }
}

liveRouter.post('/token', async (req: Request, res: Response) => {
  const sessionId = (req.params as { id: string }).id;
  const session = await getSession(sessionId);
  if (!session) throw HttpError.notFound(`No session with id "${sessionId}".`);
  if (session.mode !== 'live') throw HttpError.conflict('Create a live session before opening the realtime microphone.');

  const token = await mintRealtimeToken();
  const paths = pathsFor(sessionId);
  const keyterms = normalizeKeyterms(await readKeyterms(paths.capture), true);
  const startedAt = session.startedAt ?? new Date().toISOString();
  await saveSession({ ...session, status: 'capturing', startedAt, endedAt: null, error: null });
  res.json({
    token: token.token,
    url: 'wss://api.elevenlabs.io/v1/speech-to-text/realtime',
    model: 'scribe_v2_realtime',
    audioFormat: 'pcm_16000',
    sampleRate: 16000,
    expiresAt: token.expiresAt,
    keyterms,
  });
});

liveRouter.post('/events', async (req: Request, res: Response) => {
  const sessionId = (req.params as { id: string }).id;
  const session = await getSession(sessionId);
  if (!session) throw HttpError.notFound(`No session with id "${sessionId}".`);
  const input = LiveEventBatchSchema.parse(req.body);

  // Persist each event exactly as received before reading its contents or
  // scheduling any synthesis. Partial events are kept but never treated as
  // independent final utterances.
  await appendJsonl(sessionId, FILES.liveRaw, input.events);

  const committed = input.events
    .map((entry) => ({ receivedAt: entry.receivedAt, event: entry.event as Record<string, unknown> }))
    .filter(({ event }) => {
      const type = String(event.message_type ?? event.type ?? '');
      return type === 'committed_transcript' || type === 'committed_transcript_with_timestamps';
    });

  if (!committed.length) {
    res.status(202).json({ accepted: input.events.length, committed: 0 });
    return;
  }

  const result = await serialized(sessionId, async () => {
    const currentBundle = await loadBundle(sessionId);
    const stored = await readJson<Transcript | null>(sessionId, FILES.transcript, TranscriptSchema.nullable(), null);
    const transcript: Transcript = stored ?? {
      provider: 'elevenlabs-scribe-v2',
      model: 'scribe_v2_realtime',
      language: 'en',
      segments: [],
      wordTimingAvailable: false,
    };
    const evidence = [...currentBundle.evidence];
    const segments: TranscriptSegment[] = [...transcript.segments];
    const created: EvidenceItem[] = [];

    for (const { receivedAt, event } of committed) {
      const text = typeof event.text === 'string' ? event.text.trim() : '';
      if (!text) continue;
      const words = Array.isArray(event.words)
        ? event.words.flatMap((raw): Word[] => {
            if (!raw || typeof raw !== 'object') return [];
            const word = raw as Record<string, unknown>;
            if (typeof word.text !== 'string') return [];
            return [{
              text: word.text,
              start: typeof word.start === 'number' ? word.start : 0,
              end: typeof word.end === 'number' ? word.end : 0,
            }];
          })
        : undefined;
      const timestamp = new Date(receivedAt);
      const validTime = Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;
      const instant = validTime.toISOString();
      const baseTag = `voice ${formatClock(instant)}`;
      const duplicateCount = evidence.filter((item) => item.sourceTag === baseTag).length + created.filter((item) => item.sourceTag === baseTag).length;
      const sourceTag = duplicateCount ? `${baseTag} #${duplicateCount + 1}` : baseTag;
      const id = `live-${shortId()}`;
      const startSec = words?.[0]?.start ?? 0;
      const endSec = words?.at(-1)?.end ?? startSec;
      const segment: TranscriptSegment = {
        id,
        audioId: 'live-microphone',
        text,
        start: startSec,
        end: endSec,
        ...(words?.length ? { words } : {}),
        evidenceId: `ev-${id}`,
      };
      segments.push(segment);
      created.push({
        id: `ev-${id}`,
        kind: 'voice',
        sourceTag,
        label: text.length > 120 ? `${text.slice(0, 119).trimEnd()}…` : text,
        detail: text,
        instant,
        instantIsNaive: false,
        order: evidence.length + created.length + 1,
        sources: [],
        verification: words?.length ? 'Scribe Realtime committed transcript with word timestamps' : 'Scribe Realtime committed transcript',
        voice: { audioId: 'live-microphone', span: { startSec, endSec }, quote: text, words, transcriptId: id },
      });
    }

    transcript.segments = segments;
    transcript.wordTimingAvailable = transcript.wordTimingAvailable || created.some((item) => Boolean(item.voice?.words?.length));
    await writeJson(sessionId, FILES.transcript, transcript);
    await writeJson(sessionId, FILES.evidence, [...evidence, ...created]);
    const latest = await getSession(sessionId);
    if (latest) {
      const refreshed = await loadBundle(sessionId);
      await saveSession({ ...refreshed.session, status: 'capturing', error: null });
    }
    return created;
  });

  for (const item of result) {
    await emit(sessionId, 'evidence', { evidenceId: item.id, message: `Committed speech saved as ${item.sourceTag}.` });
  }
  if (result.length > 0) scheduleLiveIdeaSynthesis(sessionId);
  res.status(202).json({ accepted: input.events.length, committed: result.length });
});

liveRouter.post('/end', async (req: Request, res: Response) => {
  const sessionId = (req.params as { id: string }).id;
  const session = await getSession(sessionId);
  if (!session) throw HttpError.notFound(`No session with id "${sessionId}".`);
  await flushLiveIdeaSynthesis(sessionId);
  await saveSession({ ...session, status: 'processing', endedAt: new Date().toISOString() });
  const runId = await runPipeline(sessionId, { synthesizeOnly: true });
  res.status(202).json({ runId, sessionId, message: 'Live transcript is saved; final synthesis is processing.' });
});

liveRouter.post('/cancel', async (req: Request, res: Response) => {
  const sessionId = (req.params as { id: string }).id;
  const session = await getSession(sessionId);
  if (!session) throw HttpError.notFound(`No session with id "${sessionId}".`);
  await saveSession({ ...session, status: 'draft', endedAt: new Date().toISOString() });
  await finishRun(sessionId, 'cancelled');
  res.json({ sessionId, status: 'draft' });
});
