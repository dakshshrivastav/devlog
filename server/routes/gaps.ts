/** Resolve documentation gaps from typed or transcribed spoken answers. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { customAlphabet } from 'nanoid';
import type { EvidenceItem, GapItem, SessionBundle, Transcript } from '../../shared/schema/index';
import { EvidenceListSchema, ResolveGapRequestSchema, TranscriptSchema } from '../../shared/schema/index';
import { formatClock } from '../../shared/format';
import { HttpError } from '../lib/errors';
import { emit } from '../lib/runs';
import { applyGapResolution, renumberGaps } from '../lib/gapWriteback';
import { regenerateArtifacts } from '../lib/artifacts';
import { readKeyterms, transcribeAudio } from '../providers/elevenlabs';
import {
  FILES,
  ensureSessionDirs,
  getSession,
  loadBundle,
  readJson,
  saveSession,
  writeJson,
} from '../store/sessionStore';

export const gapsRouter = Router({ mergeParams: true });
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);
const allowedAudio = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.aac', '.opus']);
const voiceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 32 * 1024 * 1024, files: 1 } });

gapsRouter.post('/:gapId/voice', voiceUpload.single('audio'), async (req: Request, res: Response) => {
  const { id: sessionId, gapId } = req.params as { id: string; gapId: string };
  if (!req.file) throw HttpError.badRequest('Attach a spoken audio answer in the `audio` field.');
  const session = await getSession(sessionId);
  if (!session) throw HttpError.notFound(`No session with id "${sessionId}".`);
  const extension = path.extname(req.file.originalname).toLowerCase();
  const safeExtension = allowedAudio.has(extension)
    ? extension
    : req.file.mimetype.includes('wav')
      ? '.wav'
      : req.file.mimetype.includes('mpeg')
        ? '.mp3'
        : req.file.mimetype.includes('mp4')
          ? '.m4a'
          : '.webm';
  const paths = await ensureSessionDirs(sessionId);
  const audioId = `gap-answer-${gapId}-${nanoid()}`;
  const audioPath = path.join(paths.audio, `${audioId}${safeExtension}`);
  await writeFile(audioPath, req.file.buffer);

  const result = await transcribeAudio({
    sessionId,
    sessionDir: paths.dir,
    audioPath,
    audioId,
    keyterms: await readKeyterms(paths.capture),
  });
  const answer = result.transcript.segments.map((segment) => segment.text).join(' ').trim();
  if (!answer) throw HttpError.unprocessable('The spoken answer did not contain a committed transcript. Try speaking again or type the answer.');

  const existing = await readJson<Transcript | null>(sessionId, FILES.transcript, TranscriptSchema.nullable(), null);
  await writeJson(sessionId, FILES.transcript, {
    provider: 'elevenlabs-scribe-v2',
    model: result.transcript.model,
    language: result.transcript.language ?? existing?.language,
    wordTimingAvailable: Boolean(existing?.wordTimingAvailable || result.transcript.wordTimingAvailable),
    segments: [...(existing?.segments ?? []), ...result.transcript.segments],
  });

  const words = result.transcript.segments.flatMap((segment) => segment.words ?? []);
  const startSec = result.transcript.segments[0]?.start ?? 0;
  const endSec = result.transcript.segments.at(-1)?.end ?? startSec;
  const voice = {
    audioId,
    startSec,
    endSec,
    quote: answer,
    ...(words.length ? { words } : {}),
    transcriptId: result.transcript.segments[0]?.id,
  };

  const bundle = await resolveGap(sessionId, gapId, {
    action: 'resolve',
    answer,
    method: 'voice',
    voice,
  });
  res.json(bundle);
});

gapsRouter.post('/:gapId', async (req: Request, res: Response) => {
  const { id: sessionId, gapId } = req.params as { id: string; gapId: string };
  const body = ResolveGapRequestSchema.parse(req.body ?? {});
  res.json(await resolveGap(sessionId, gapId, body));
});

async function resolveGap(
  sessionId: string,
  gapId: string,
  body: ReturnType<typeof ResolveGapRequestSchema.parse>
): Promise<SessionBundle> {
  const bundle = await loadBundle(sessionId);
  const gap = bundle.gaps.find((item) => item.id === gapId);
  if (!gap) throw HttpError.notFound(`No gap "${gapId}" in this session.`);
  if (gap.status !== 'open') throw HttpError.conflict(`Gap ${gap.number} is already ${gap.status}.`);

  const now = new Date().toISOString();
  const deferred = body.action === 'defer';
  const answer = deferred ? (body.answer?.trim() || 'Deferred to a later revision') : (body.answer ?? '').trim();
  const evidence = await readJson<EvidenceItem[]>(sessionId, FILES.evidence, EvidenceListSchema, []);
  const nextOrder = evidence.reduce((max, item) => Math.max(max, item.order), 0) + 1;
  const evidenceId = `ev-answer-${nanoid()}`;

  let evidenceToAdd: EvidenceItem[] = [];
  if (!deferred) {
    evidenceToAdd = [body.method === 'voice' && body.voice
      ? {
          id: evidenceId,
          kind: 'voice',
          sourceTag: `voice ${formatClock(now)} answer`,
          label: `Spoken answer to gap ${gap.number}`,
          detail: gap.question,
          instant: now,
          instantIsNaive: false,
          order: nextOrder,
          sources: [],
          verification: 'Transcribed from the builder’s spoken gap answer',
          voice: {
            audioId: body.voice.audioId,
            span: { startSec: body.voice.startSec, endSec: body.voice.endSec },
            quote: answer,
            words: body.voice.words,
            transcriptId: body.voice.transcriptId,
          },
        }
      : {
          id: evidenceId,
          kind: 'note',
          sourceTag: `answer ${formatClock(now)}`,
          label: `Builder answer to gap ${gap.number}`,
          detail: gap.question,
          instant: now,
          instantIsNaive: false,
          order: nextOrder,
          sources: [],
          verification: 'Recorded from the builder’s answer in the UI',
          note: { text: answer, origin: 'gap-answer' },
        }];
  }

  const writeBack = deferred
    ? { bom: bundle.bom, hardware: bundle.hardware, ideas: bundle.ideas, incidents: bundle.incidents, touched: [] as string[] }
    : applyGapResolution({
        gap,
        answer,
        evidenceId,
        bom: bundle.bom,
        hardware: bundle.hardware,
        ideas: bundle.ideas,
        incidents: bundle.incidents,
      });

  const gaps: GapItem[] = renumberGaps(bundle.gaps.map((item) => item.id === gapId
    ? {
        ...item,
        status: deferred ? 'deferred' : 'resolved',
        resolution: {
          answer,
          method: deferred ? 'deferred' : body.method,
          resolvedAt: now,
          evidenceId: deferred ? undefined : evidenceId,
        },
      }
    : item));

  await writeJson(sessionId, FILES.evidence, [...evidence, ...evidenceToAdd]);
  await writeJson(sessionId, FILES.gaps, gaps);
  await writeJson(sessionId, FILES.bom, writeBack.bom);
  await writeJson(sessionId, FILES.hardwareGraph, writeBack.hardware);
  await writeJson(sessionId, FILES.ideasGraph, writeBack.ideas);
  await writeJson(sessionId, FILES.incidents, writeBack.incidents);

  const artifacts = await regenerateArtifacts(sessionId);
  await emit(sessionId, 'gap', {
    gapId,
    message: deferred
      ? `Gap ${gap.number} deferred.`
      : `Gap ${gap.number} resolved${writeBack.touched.length ? ` — updated ${writeBack.touched.join(', ')}` : ''}.`,
  });
  for (const artifact of artifacts) await emit(sessionId, 'artifact', { artifactName: artifact.name, message: `${artifact.name} regenerated — ${artifact.statusLabel}` });
  await saveSession((await loadBundle(sessionId)).session);
  return loadBundle(sessionId);
}
