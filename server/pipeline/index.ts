/**
 * Pipeline entry point.
 *
 * Batch and live share every stage after transcription: the same timeline
 * assembly, the same synthesis prompts, the same validators. Live mode feeds
 * the pipeline incrementally from committed transcript chunks; batch feeds it
 * once from a finished capture directory.
 */
import { config } from '../config';
import { HttpError } from '../lib/errors';
import { runMockPipeline } from './mock';

export interface ProcessOptions {
  /** Reuse the stored transcript and evidence; only re-synthesize artifacts. */
  synthesizeOnly?: boolean;
}

export async function runPipeline(
  sessionId: string,
  options: ProcessOptions = {}
): Promise<string> {
  if (config.mock) return runMockPipeline(sessionId);
  if (!config.gemini.apiKey) {
    throw HttpError.unprocessable(
      'GEMINI_API_KEY is required to synthesize documentation. Add it to .env and restart, or set MOCK=1 to work from fixtures.'
    );
  }
  const { runBatchPipeline } = await import('./batch.js');
  return runBatchPipeline(sessionId, options);
}

export { runMockPipeline };
