/**
 * Mock pipeline.
 *
 * Used when `MOCK=1` or when no provider keys are configured. It walks the real
 * stage sequence and reports truthfully about what it did — which is read what
 * is already on disk, not call any provider. It never fabricates evidence,
 * measurements or documents.
 */
import { config } from '../config';
import { finishRun, setStage, emit, startRun } from '../lib/runs';
import { loadBundle, readArtifacts, saveSession } from '../store/sessionStore';
import { HttpError } from '../lib/errors';
import { formatEvidenceBreakdown } from '../lib/derive';
import type { RunStage } from '../../shared/schema/index';

const STAGES: { stage: RunStage; progress: number; waitMs: number }[] = [
  { stage: 'ingest', progress: 0.08, waitMs: 260 },
  { stage: 'transcribe', progress: 0.26, waitMs: 420 },
  { stage: 'media', progress: 0.42, waitMs: 300 },
  { stage: 'git', progress: 0.56, waitMs: 260 },
  { stage: 'timeline', progress: 0.68, waitMs: 300 },
  { stage: 'synthesize', progress: 0.82, waitMs: 460 },
  { stage: 'validate', progress: 0.92, waitMs: 320 },
  { stage: 'write', progress: 0.98, waitMs: 240 },
];

const STAGE_LABELS: Record<RunStage, string> = {
  queued: 'Queued',
  ingest: 'Reading capture directory',
  transcribe: 'Transcribing speech',
  media: 'Indexing bench photos',
  git: 'Reading git history',
  timeline: 'Assembling timeline',
  synthesize: 'Synthesizing documentation',
  validate: 'Validating claims and diagrams',
  write: 'Writing artifacts',
  done: 'Done',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runMockPipeline(sessionId: string): Promise<string> {
  const bundle = await loadBundle(sessionId);

  if (bundle.evidence.length === 0) {
    throw HttpError.unprocessable(
      'Mock mode has no provider access, so there is nothing to transcribe or synthesize. ' +
        'Open the fixture session, or set GEMINI_API_KEY and ELEVENLABS_API_KEY and restart the server.'
    );
  }

  const run = await startRun(sessionId, 'batch');

  // Detached: the route returns the run id immediately and the client streams
  // progress over SSE.
  void (async () => {
    try {
      await emit(sessionId, 'log', {
        message: `Mock mode — no provider calls. Replaying stored session state.`,
      });

      const session = bundle.session;
      session.status = 'processing';
      await saveSession(session);

      for (const { stage, progress, waitMs } of STAGES) {
        await setStage(sessionId, stage, progress, STAGE_LABELS[stage]);
        await sleep(waitMs);

        if (stage === 'ingest') {
          await emit(sessionId, 'evidence', {
            message: `${bundle.evidence.length} evidence items on disk (${formatEvidenceBreakdown(
              bundle.session.counts
            )}).`,
          });
        }
        if (stage === 'transcribe') {
          await emit(sessionId, 'log', {
            message: bundle.transcript
              ? `Transcript present: ${bundle.transcript.segments.length} segments, provider ${bundle.transcript.provider}.`
              : 'No transcript stored for this session.',
            level: bundle.transcript ? 'info' : 'warn',
          });
        }
        if (stage === 'git') {
          await emit(sessionId, 'log', {
            message: session.repoPath
              ? `Repository recorded at ${session.repoPath}.`
              : 'No repository path set for this session.',
            level: session.repoPath ? 'info' : 'warn',
          });
        }
        if (stage === 'synthesize') {
          const artifacts = await readArtifacts(sessionId);
          for (const artifact of artifacts) {
            await emit(sessionId, 'artifact', {
              artifactName: artifact.name,
              message: `${artifact.name} — ${artifact.statusLabel}`,
            });
          }
        }
        if (stage === 'validate') {
          const openGaps = bundle.gaps.filter((g) => g.status === 'open').length;
          await emit(sessionId, 'gap', {
            message:
              openGaps > 0
                ? `${openGaps} open gap question${openGaps === 1 ? '' : 's'} remain before export.`
                : 'No open gap questions.',
            level: openGaps > 0 ? 'warn' : 'info',
          });
          await emit(sessionId, 'log', {
            message: `Grounding: ${bundle.session.grounding.percent}% of statements cite evidence (${bundle.session.grounding.sourced}/${
              bundle.session.grounding.sourced + bundle.session.grounding.unsourced
            }).`,
          });
        }
      }

      const finalSession = await loadBundle(sessionId);
      finalSession.session.status = 'ready';
      await saveSession(finalSession.session);

      await finishRun(sessionId, 'completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mock run failed.';
      try {
        const failed = await loadBundle(sessionId);
        failed.session.status = 'failed';
        failed.session.error = message;
        await saveSession(failed.session);
      } catch {
        // Session is gone; nothing left to mark.
      }
      await finishRun(sessionId, 'failed', message);
    }
  })();

  return run.id;
}

export function describeMockMode(): string {
  return config.mockForced
    ? 'MOCK=1 — fixtures only'
    : 'No provider keys found — fixtures only';
}
