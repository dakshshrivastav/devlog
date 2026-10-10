/**
 * The generated documentation entities: BOM, gaps, incidents, observer notes
 * and artifacts. Every one of them is written to disk as a real file; these
 * schemas describe the structured form the UI renders from.
 */
import { z } from 'zod';
import { IdSchema, InstantSchema, SourcesSchema } from './core';

/* -------------------------------------------------------------------------- */
/* Bill of materials                                                           */
/* -------------------------------------------------------------------------- */

export const BomStatusSchema = z.enum(['verified', 'needs-pn', 'installed', 'unverified']);
export type BomStatus = z.infer<typeof BomStatusSchema>;

/**
 * Cost is optional and only present when something actually sourced it. The
 * prototype invented unit prices for every row; we do not.
 */
export const CostSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  sources: SourcesSchema,
});
export type Cost = z.infer<typeof CostSchema>;

export const BomItemSchema = z.object({
  id: IdSchema,
  designator: z.string(),
  name: z.string(),
  spec: z.string(),
  qty: z.number().int(),
  sources: SourcesSchema,
  status: BomStatusSchema,
  unitCost: CostSchema.optional(),
  /** Set when a gap question is blocking this row's specification. */
  gapId: IdSchema.optional(),
  mediaUrl: z.string().optional(),
});
export type BomItem = z.infer<typeof BomItemSchema>;

export const BenchToolSchema = z.object({
  id: IdSchema,
  code: z.string(),
  name: z.string(),
  description: z.string(),
  specs: z.string().optional(),
  /** Material Symbols ligature name. */
  icon: z.string(),
  sources: SourcesSchema,
});
export type BenchTool = z.infer<typeof BenchToolSchema>;

export const BomStatsSchema = z.object({
  items: z.number().int(),
  verified: z.number().int(),
  needsPn: z.number().int(),
  percentVerified: z.number(),
  /** Present only when every row has a sourced cost. */
  totalCost: CostSchema.optional(),
});
export type BomStats = z.infer<typeof BomStatsSchema>;

export const BomSchema = z.object({
  revision: z.string().optional(),
  items: z.array(BomItemSchema),
  tools: z.array(BenchToolSchema),
  stats: BomStatsSchema,
});
export type Bom = z.infer<typeof BomSchema>;

/* -------------------------------------------------------------------------- */
/* Gaps                                                                        */
/* -------------------------------------------------------------------------- */

export const GapPrioritySchema = z.enum(['high', 'medium', 'low']);
export type GapPriority = z.infer<typeof GapPrioritySchema>;

export const GapStatusSchema = z.enum(['open', 'resolved', 'deferred']);
export type GapStatus = z.infer<typeof GapStatusSchema>;

export const GapTargetSchema = z.object({
  kind: z.enum(['bom', 'hardware', 'idea', 'incident', 'artifact', 'chronology']),
  id: IdSchema,
  field: z.string().optional(),
});
export type GapTarget = z.infer<typeof GapTargetSchema>;

export const GapResolutionSchema = z.object({
  answer: z.string(),
  method: z.enum(['text', 'voice', 'deferred']),
  resolvedAt: z.string(),
  /** Present when the answer was spoken: the answer itself became evidence. */
  evidenceId: IdSchema.optional(),
});
export type GapResolution = z.infer<typeof GapResolutionSchema>;

export const GapItemSchema = z.object({
  id: IdSchema,
  number: z.string(),
  question: z.string(),
  description: z.string(),
  targetDoc: z.string(),
  priority: GapPrioritySchema,
  status: GapStatusSchema,
  appliesTo: z.array(GapTargetSchema).default([]),
  resolution: GapResolutionSchema.optional(),
  placeholder: z.string().optional(),
});
export type GapItem = z.infer<typeof GapItemSchema>;

/* -------------------------------------------------------------------------- */
/* Incidents — Troubleshooting                                                 */
/* -------------------------------------------------------------------------- */

export const IncidentLevelSchema = z.enum(['hardware', 'firmware', 'wiring', 'environmental']);
export type IncidentLevel = z.infer<typeof IncidentLevelSchema>;

export const IncidentMeasurementSchema = z.object({
  label: z.string(),
  value: z.string(),
  sources: SourcesSchema,
});
export type IncidentMeasurement = z.infer<typeof IncidentMeasurementSchema>;

export const BenchRuleSchema = z.object({
  title: z.string(),
  body: z.string(),
  sources: SourcesSchema,
});
export type BenchRule = z.infer<typeof BenchRuleSchema>;

export const IncidentSchema = z.object({
  id: IdSchema,
  number: z.string(),
  title: z.string(),
  level: IncidentLevelSchema,
  status: z.enum(['open', 'resolved']),
  phase: z.string().optional(),
  detectedAt: InstantSchema,
  resolvedAt: InstantSchema,
  telemetryTarget: z.string().optional(),
  symptom: z.string(),
  measurements: z.array(IncidentMeasurementSchema),
  rootCause: z.string(),
  fix: z.string(),
  verification: z.string().optional(),
  rulesLearned: z.array(BenchRuleSchema),
  relatedCommits: z.array(IdSchema),
  sources: SourcesSchema,
  mediaUrl: z.string().optional(),
  mediaCaption: z.string().optional(),
});
export type Incident = z.infer<typeof IncidentSchema>;

/* -------------------------------------------------------------------------- */
/* Observer notes                                                              */
/* -------------------------------------------------------------------------- */

export const ObservationKindSchema = z.enum(['speech', 'photo', 'commit', 'note']);
export type ObservationKind = z.infer<typeof ObservationKindSchema>;

export const ObservationNoteSchema = z.object({
  id: IdSchema,
  instant: InstantSchema,
  /** Pre-formatted clock label, e.g. "14:08". */
  timeLabel: z.string(),
  kind: ObservationKindSchema,
  /** Third person, past tense. Validated against acceptance checks C9 and C10. */
  title: z.string(),
  body: z.string().optional(),
  tag: z.string().optional(),
  sourceLabel: z.string(),
  evidenceId: IdSchema.optional(),
  media: z
    .object({
      url: z.string(),
      caption: z.string().optional(),
      meta: z.string().optional(),
    })
    .optional(),
  /** Renders the trace sparkline when a real measurement backs the note. */
  measurementId: IdSchema.optional(),
});
export type ObservationNote = z.infer<typeof ObservationNoteSchema>;

/* -------------------------------------------------------------------------- */
/* Artifacts                                                                   */
/* -------------------------------------------------------------------------- */

export const ArtifactKindSchema = z.enum(['markdown', 'mermaid', 'json', 'csv']);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const ArtifactStatusSchema = z.enum([
  'ready',
  'validated',
  'in-progress',
  'needs-input',
  'omitted',
  'failed',
]);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

export const ArtifactSchema = z.object({
  id: IdSchema,
  /** Display filename, e.g. `diagrams/system.mmd`. */
  name: z.string(),
  /** Path relative to the session directory. */
  path: z.string(),
  kind: ArtifactKindSchema,
  /** Short kind label shown in the deliverables table, e.g. `schematic`. */
  kindLabel: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  status: ArtifactStatusSchema,
  statusLabel: z.string(),
  bytes: z.number().int().optional(),
  hash: z.string().optional(),
  sources: SourcesSchema,
  gapIds: z.array(IdSchema).default([]),
  generatedAt: InstantSchema,
  /** Which view opens this artifact. */
  targetView: z.string().optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;
