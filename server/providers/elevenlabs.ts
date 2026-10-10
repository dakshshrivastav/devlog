/**
 * ElevenLabs provider: Scribe v2 batch transcription, realtime single-use
 * tokens, and normalization into the shared transcript schema.
 *
 * Endpoint and field details recorded in docs/references/elevenlabs-batch-stt.md
 * and docs/elevenlabs_agents_stt_tts_reference.md (checked 2026-10-10).
 *
 * The complete provider response is always persisted before normalization, so a
 * bug in this file can never destroy captured speech.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Transcript, TranscriptSegment, Word } from '../../shared/schema/index';
import { HttpError } from '../lib/errors';
import { config } from '../config';

const BATCH_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const MAX_KEYTERMS_BATCH = 1000;
const MAX_KEYTERMS_REALTIME = 50;
const MAX_KEYTERM_CHARS = 50;

/** Pause length that starts a new segment. */
const SEGMENT_GAP_SEC = 1.2;
const SENTENCE_END = /[.!?]["')\]]*$/;

interface ProviderWord {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
}

interface ProviderResponse {
  language?: string;
  language_probability?: number;
  text?: string;
  words?: ProviderWord[];
  [key: string]: unknown;
}

function requireKey(): string {
  const key = config.elevenlabs.apiKey;
  if (!key) {
    throw HttpError.unprocessable(
      'ELEVENLABS_API_KEY is not set. Add it to .env, or run with MOCK=1 to work from fixtures.'
    );
  }
  return key;
}

/** Keyterms are validated locally before sending — the endpoint rejects bad shapes. */
export function normalizeKeyterms(raw: readonly string[], realtime = false): string[] {
  const limit = realtime ? MAX_KEYTERMS_REALTIME : MAX_KEYTERMS_BATCH;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of raw) {
    const clean = term.trim();
    if (!clean || clean.length > MAX_KEYTERM_CHARS) continue;
    if (clean.split(/\s+/).length > 5) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

export async function readKeyterms(captureDir: string): Promise<string[]> {
  try {
    const raw = await readFile(path.join(captureDir, 'keyterms.txt'), 'utf8');
    return normalizeKeyterms(raw.split(/[\n,]/).map((t) => t.trim()).filter(Boolean));
  } catch {
    return [];
  }
}

function normalizeWords(words: readonly ProviderWord[]): Word[] {
  return words
    .filter((w): w is ProviderWord & { text: string } => typeof w.text === 'string' && w.text.length > 0)
    .map((w) => ({
      text: w.text as string,
      start: typeof w.start === 'number' ? w.start : 0,
      end: typeof w.end === 'number' ? w.end : (typeof w.start === 'number' ? w.start : 0),
    }));
}

/**
 * Group word timings into utterances. A new segment starts after a long pause
 * or at a sentence boundary, whichever comes first. Word timings are used as
 * delivered; nothing is synthesized when the provider omits them.
 */
export function segmentWords(
  words: readonly Word[],
  audioId: string,
  wordTimingAvailable: boolean
): TranscriptSegment[] {
  if (words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let current: Word[] = [];
  let index = 0;

  const flush = (): void => {
    if (current.length === 0) return;
    index += 1;
    const text = current.map((w) => w.text).join(' ').replace(/\s+([,.!?;:])/g, '$1').trim();
    segments.push({
      id: `${audioId}-seg-${index}`,
      audioId,
      text,
      start: current[0].start,
      end: current[current.length - 1].end,
      words: wordTimingAvailable ? current : undefined,
    });
    current = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    current.push(word);

    const next = words[i + 1];
    const gap = next ? next.start - word.end : Number.POSITIVE_INFINITY;
    const sentenceEnd = SENTENCE_END.test(word.text) && current.length >= 3;

    if (gap > SEGMENT_GAP_SEC || sentenceEnd) flush();
  }
  flush();

  return segments;
}

export interface TranscribeResult {
  transcript: Transcript;
  rawPath: string;
}

/**
 * Batch transcription for one audio file. The raw provider response is written
 * to `raw/stt/<audioId>.json` first; normalization happens after.
 */
export async function transcribeAudio(input: {
  sessionId: string;
  sessionDir: string;
  audioPath: string;
  audioId: string;
  keyterms?: string[];
}): Promise<TranscribeResult> {
  const key = requireKey();
  const { sessionId, sessionDir, audioPath, audioId } = input;

  const bytes = await readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), path.basename(audioPath));
  form.append('model_id', config.elevenlabs.batchModel);
  form.append('timestamps_granularity', 'word');
  for (const term of normalizeKeyterms(input.keyterms ?? [])) {
    form.append('keyterms', term);
  }

  let response: Response;
  try {
    response = await fetch(BATCH_URL, {
      method: 'POST',
      headers: { 'xi-api-key': key },
      body: form,
    });
  } catch (err) {
    throw HttpError.provider(
      `Could not reach ElevenLabs for ${path.basename(audioPath)}: ${(err as Error).message}`
    );
  }

  const rawText = await response.text();
  const rawDir = path.join(sessionDir, 'raw', 'stt');
  await mkdir(rawDir, { recursive: true });
  const rawPath = path.join(rawDir, `${audioId}.json`);

  // Persist whatever came back, including errors, before interpreting it.
  await writeFile(
    rawPath,
    JSON.stringify(
      {
        requestedAt: new Date().toISOString(),
        audioId,
        session: sessionId,
        model: config.elevenlabs.batchModel,
        status: response.status,
        body: tryParseJson(rawText),
      },
      null,
      2
    ),
    'utf8'
  );

  if (!response.ok) {
    // Authentication and validation failures are permanent; do not retry.
    throw HttpError.provider(
      `ElevenLabs returned ${response.status} for ${path.basename(audioPath)}. ` +
        `Raw response saved to raw/stt/${audioId}.json.`,
      { status: response.status }
    );
  }

  const parsed = tryParseJson(rawText) as ProviderResponse | null;
  if (!parsed) {
    throw HttpError.provider(`ElevenLabs returned a non-JSON body for ${path.basename(audioPath)}.`);
  }

  const words = normalizeWords(parsed.words ?? []);
  const wordTimingAvailable = words.some((w) => w.end > w.start);
  const segments =
    words.length > 0
      ? segmentWords(words, audioId, wordTimingAvailable)
      : fallbackSegments(parsed.text ?? '', audioId);

  return {
    rawPath,
    transcript: {
      provider: 'elevenlabs-scribe-v2',
      model: config.elevenlabs.batchModel,
      language: parsed.language,
      segments,
      wordTimingAvailable,
    },
  };
}

/** When the provider gives text but no word timings, keep the text honestly. */
function fallbackSegments(text: string, audioId: string): TranscriptSegment[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return [
    {
      id: `${audioId}-seg-1`,
      audioId,
      text: trimmed,
      start: 0,
      end: 0,
    },
  ];
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function transcribeSession(input: {
  sessionId: string;
  sessionDir: string;
  audioPaths: { audioId: string; path: string }[];
  keyterms?: string[];
}): Promise<Transcript> {
  const segments: TranscriptSegment[] = [];
  let language: string | undefined;
  let wordTimingAvailable = false;

  for (const audio of input.audioPaths) {
    const result = await transcribeAudio({
      sessionId: input.sessionId,
      sessionDir: input.sessionDir,
      audioPath: audio.path,
      audioId: audio.audioId,
      keyterms: input.keyterms,
    });
    segments.push(...result.transcript.segments);
    wordTimingAvailable = wordTimingAvailable || result.transcript.wordTimingAvailable;
    language = language ?? result.transcript.language;
  }

  return {
    provider: 'elevenlabs-scribe-v2',
    model: config.elevenlabs.batchModel,
    language,
    segments,
    wordTimingAvailable,
  };
}

/* -------------------------------------------------------------------------- */
/* Realtime single-use tokens                                                  */
/* -------------------------------------------------------------------------- */

export interface RealtimeToken {
  token: string;
  expiresAt: string | null;
}

/**
 * Mint a short-lived browser token. The documented type is `realtime_scribe`;
 * tokens expire after about 15 minutes and are consumed on use, so the client
 * re-requests one per connection attempt.
 */
export async function mintRealtimeToken(): Promise<RealtimeToken> {
  const key = requireKey();

  let response: Response;
  try {
    response = await fetch(config.elevenlabs.tokenUrl, {
      method: 'POST',
      headers: { 'xi-api-key': key },
    });
  } catch (err) {
    throw HttpError.provider(`Could not reach ElevenLabs to mint a token: ${(err as Error).message}`);
  }

  const body = (await response.json().catch(() => null)) as
    | { token?: string; expires_at?: number; expiresAt?: number }
    | null;

  if (!response.ok || !body?.token) {
    throw HttpError.provider(
      `ElevenLabs refused to mint a realtime token (HTTP ${response.status}). ` +
        'Check that the key has speech-to-text access and that `realtime_scribe` is a supported token type.',
      { status: response.status }
    );
  }

  const expiresMs = body.expires_at ?? body.expiresAt;
  return {
    token: body.token,
    expiresAt:
      typeof expiresMs === 'number'
        ? new Date(expiresMs < 1e12 ? expiresMs * 1000 : expiresMs).toISOString()
        : null,
  };
}
