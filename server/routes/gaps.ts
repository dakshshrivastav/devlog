/**
 * Gap resolution.
 *
 * Answering a gap is a real mutation with four effects: the answer becomes
 * evidence of its own, every structured statement the gap was blocking is
 * updated from it, the documentation bundle is regenerated, and the run log
 * records what changed.
 */
import { Router, type Request, type Response } from 'express';
import { customAlphabet } from 'nanoid';
import type { EvidenceItem, GapItem } from '../../shared/schema/index';
import { ResolveGapRequestSchema } from '../../shared/schema/index';
import { HttpError } from '../lib/errors';
import { emit } from '../lib/runs';
import { applyGapResolution, renumberGaps } from '../lib/gapWriteback';
import { regenerateArtifacts } from '../lib/artifacts';
import {
  FILES,
  loadBundle,
  readJson,
  writeJson,
} from '../store/sessionStore';
import { EvidenceListSchema } from '../../shared/schema/index';
import { formatClock } from '../../shared/format';

export const gapsRouter = Router({ mergeParams: true });
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

gapsRouter.post('/:gapId', async (req: Request, res: Response) => {
  const { id: sessionId, gapId } = req.params as { id: string; gapId: string };
  const body = ResolveGapRequestSchema.parse(req.body ?? {});
  const bundle = await loadBundle(sessionId);

  const gap = bundle.gaps.find((g) => g.id === gapId);
  if (!gap) throw HttpError.notFound(`No gap "${gapId}" in this session.`);
  if (gap.status !== 'open') {
    throw HttpError.conflict(`Gap ${gap.number} is already ${gap.status}.`);
  }

  if (body.method === 'voice') {
    throw HttpError.notImplemented(
      'Spoken gap answers need the transcription adapter, which is wired up with the batch pipeline.'
    );
  }

  const now = new Date().toISOString();
  const deferred = body.action === 'defer';
  const answer = deferred
    ? (body.answer?.trim() || 'Deferred to a later revision')
    : (body.answer ?? '').trim();

  /* 1. The answer becomes evidence. */
  const evidence = await readJson<EvidenceItem[]>(
    sessionId,
    FILES.evidence,
    EvidenceListSchema,
    []
  );
  const nextOrder = evidence.reduce((max, item) => Math.max(max, item.order), 0) + 1;
  const evidenceId = `ev-answer-${nanoid()}`;

  let evidenceToAdd: EvidenceItem[] = [];
  if (!deferred) {
    evidenceToAdd = [
      {
        id: evidenceId,
        kind: 'note',
        sourceTag: `answer ${formatClock(now)}`,
        label: `Builder answer to gap ${gap.number}`,
        detail: gap.question,
        instant: now,
        instantIsNaive: false,
        order: nextOrder,
        verification: 'Recorded from the builder’s answer in the UI',
        note: { text: answer, origin: 'gap-answer' },
      },
    ];
  }

  /* 2. Write back into everything the gap was blocking. */
  const writeBack = deferred
    ? {
        bom: bundle.bom,
        hardware: bundle.hardware,
        ideas: bundle.ideas,
        incidents: bundle.incidents,
        touched: [] as string[],
      }
    : applyGapResolution({
        gap,
        answer,
        evidenceId,
        bom: bundle.bom,
        hardware: bundle.hardware,
        ideas: bundle.ideas,
        incidents: bundle.incidents,
      });

  /* 3. Update the gap itself. */
  const gaps: GapItem[] = renumberGaps(
    bundle.gaps.map((g) =>
      g.id === gapId
        ? {
            ...g,
            status: deferred ? 'deferred' : 'resolved',
            resolution: {
              answer,
              method: deferred ? 'deferred' : body.method,
              resolvedAt: now,
              evidenceId: deferred ? undefined : evidenceId,
            },
          }
        : g
    )
  );

  /* 4. Persist, then regenerate the bundle from the new state. */
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
      : `Gap ${gap.number} resolved${
          writeBack.touched.length > 0 ? ` — updated ${writeBack.touched.join(', ')}` : ''
        }.`,
  });
  for (const artifact of artifacts) {
    await emit(sessionId, 'artifact', {
      artifactName: artifact.name,
      message: `${artifact.name} regenerated — ${artifact.statusLabel}`,
    });
  }

  res.json(await loadBundle(sessionId));
});
