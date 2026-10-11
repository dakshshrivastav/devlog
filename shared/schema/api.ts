/**
 * Wire types: what the HTTP surface and the SSE stream carry, plus the view
 * identifiers that both sides agree on.
 */
import { z } from 'zod';
import { EvidenceItemSchema, SessionSchema, TranscriptSchema } from './core';
import {
  ArtifactSchema,
  BenchToolSchema,
  BomItemSchema,
  BomSchema,
  GapItemSchema,
  IncidentSchema,
  ObservationNoteSchema,
} from './docs';
import { ChronologySchema, HardwareGraphSchema, IdeaGraphSchema } from './knowledge';
import { IdSchema } from './core';

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

export const ActiveViewSchema = z.enum([
  'sessions',
  'overview',
  'timeline',
  'living-map',
  'live-flowchart',
  'observations',
  'system-diagrams',
  'bom-and-parts',
  'troubleshooting',
  'finished-docs',
]);
export type ActiveView = z.infer<typeof ActiveViewSchema>;

/* -------------------------------------------------------------------------- */
/* Runs and streaming events                                                   */
/* -------------------------------------------------------------------------- */

export const RunStageSchema = z.enum([
  'queued',
  'ingest',
  'transcribe',
  'media',
  'git',
  'timeline',
  'synthesize',
  'validate',
  'write',
  'done',
]);
export type RunStage = z.infer<typeof RunStageSchema>;

export const RunEventTypeSchema = z.enum([
  'stage',
  'log',
  'evidence',
  'artifact',
  'gap',
  'graph',
  'done',
  'error',
]);
export type RunEventType = z.infer<typeof RunEventTypeSchema>;

export const RunEventSchema = z.object({
  id: IdSchema,
  at: z.string(),
  type: RunEventTypeSchema,
  stage: RunStageSchema.optional(),
  message: z.string().optional(),
  level: z.enum(['info', 'warn', 'error']).default('info'),
  /** 0..1 across the whole run. */
  progress: z.number().optional(),
  artifactName: z.string().optional(),
  gapId: IdSchema.optional(),
  evidenceId: IdSchema.optional(),
});
export type RunEvent = z.infer<typeof RunEventSchema>;

export const RunStatusSchema = z.enum(['running', 'completed', 'failed', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunSchema = z.object({
  id: IdSchema,
  sessionId: IdSchema,
  mode: z.enum(['batch', 'live-incremental']),
  status: RunStatusSchema,
  stage: RunStageSchema,
  progress: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  /** Trailing window of events, newest last. */
  events: z.array(RunEventSchema),
});
export type Run = z.infer<typeof RunSchema>;

/* -------------------------------------------------------------------------- */
/* Session bundle — one GET hydrates the whole UI                              */
/* -------------------------------------------------------------------------- */

export const SessionBundleSchema = z.object({
  session: SessionSchema,
  evidence: z.array(EvidenceItemSchema),
  transcript: TranscriptSchema.nullable(),
  chronology: ChronologySchema,
  ideas: IdeaGraphSchema,
  hardware: HardwareGraphSchema,
  bom: BomSchema,
  gaps: z.array(GapItemSchema),
  incidents: z.array(IncidentSchema),
  observations: z.array(ObservationNoteSchema),
  artifacts: z.array(ArtifactSchema),
  run: RunSchema.nullable(),
});
export type SessionBundle = z.infer<typeof SessionBundleSchema>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export const CreateSessionRequestSchema = z.object({
  name: z.string().min(1).optional(),
  mode: z.enum(['batch', 'live']).default('batch'),
  repoPath: z.string().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const PatchSessionRequestSchema = z.object({
  name: z.string().min(1).optional(),
  repoPath: z.string().nullable().optional(),
});
export type PatchSessionRequest = z.infer<typeof PatchSessionRequestSchema>;

export const ProcessRequestSchema = z.object({
  /** Re-run synthesis only, reusing stored transcript and evidence. */
  synthesizeOnly: z.boolean().optional(),
});
export type ProcessRequest = z.infer<typeof ProcessRequestSchema>;

export const ResolveGapRequestSchema = z
  .object({
    action: z.enum(['resolve', 'defer']).default('resolve'),
    answer: z.string().optional(),
    method: z.enum(['text', 'voice']).default('text'),
    voice: z
      .object({
        audioId: z.string(),
        startSec: z.number(),
        endSec: z.number(),
        quote: z.string(),
        words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })).optional(),
        transcriptId: z.string().optional(),
      })
      .optional(),
  })
  .refine((value) => value.action === 'defer' || (value.answer ?? '').trim().length > 0, {
    message: 'A non-empty answer is required to resolve a gap.',
    path: ['answer'],
  })
  .refine((value) => value.method !== 'voice' || value.action === 'defer' || value.voice !== undefined, {
    message: 'A voice resolution must include its stored transcript/audio reference.',
    path: ['voice'],
  });
export type ResolveGapRequest = z.infer<typeof ResolveGapRequestSchema>;

/**
 * Raw provider events forwarded from the browser during live capture. They are
 * appended verbatim to `raw/live.jsonl` before anything else happens.
 */
export const LiveEventBatchSchema = z.object({
  events: z.array(
    z.object({
      receivedAt: z.string(),
      event: z.unknown(),
    })
  ),
});
export type LiveEventBatch = z.infer<typeof LiveEventBatchSchema>;

export const LiveTokenResponseSchema = z.object({
  token: z.string(),
  url: z.string(),
  model: z.string(),
  audioFormat: z.string(),
  sampleRate: z.number().int(),
  expiresAt: z.string().nullable(),
  keyterms: z.array(z.string()).optional(),
});
export type LiveTokenResponse = z.infer<typeof LiveTokenResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export const SearchResultKindSchema = z.enum([
  'evidence',
  'observation',
  'bom',
  'tool',
  'gap',
  'artifact',
  'idea',
  'hardware',
  'incident',
]);
export type SearchResultKind = z.infer<typeof SearchResultKindSchema>;

export const SearchResultSchema = z.object({
  id: z.string(),
  kind: SearchResultKindSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  /** Material Symbols ligature name. */
  icon: z.string(),
  category: z.string(),
  targetView: ActiveViewSchema,
  sessionId: IdSchema,
  score: z.number().optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Errors and health                                                           */
/* -------------------------------------------------------------------------- */

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  mock: z.boolean(),
  geminiAuth: z.enum(['developer-api', 'vertex-adc', 'missing']),
  providers: z.object({
    gemini: z.boolean(),
    elevenlabs: z.boolean(),
  }),
  dataDir: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export type { ArtifactSchema, BomItemSchema, BenchToolSchema };
