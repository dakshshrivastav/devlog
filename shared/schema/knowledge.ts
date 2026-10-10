/**
 * The three knowledge structures. These are deliberately separate models, not
 * three renderings of one graph — see docs/BUILD_PLAN.md §1.1.
 *
 *   chronology  → Living Map      (when things happened)
 *   ideas       → Live Flowchart  (how thinking developed)
 *   hardware    → System Diagrams (what is physically true)
 */
import { z } from 'zod';
import { IdSchema, InstantSchema, SourcesSchema } from './core';

/* -------------------------------------------------------------------------- */
/* Chronology — Living Map                                                     */
/* -------------------------------------------------------------------------- */

export const ChronologyEntryKindSchema = z.enum([
  'note',
  'evidence',
  'artifact',
  'milestone',
  'gap',
]);
export type ChronologyEntryKind = z.infer<typeof ChronologyEntryKindSchema>;

export const ChronologyPhaseSchema = z.object({
  id: IdSchema,
  title: z.string(),
  summary: z.string().optional(),
  startInstant: InstantSchema,
  endInstant: InstantSchema,
  entryIds: z.array(IdSchema),
});
export type ChronologyPhase = z.infer<typeof ChronologyPhaseSchema>;

export const ChronologyEntrySchema = z.object({
  id: IdSchema,
  phaseId: IdSchema,
  /** Vertical lane on the map: a topic or workstream, not a timestamp. */
  lane: z.string(),
  instant: InstantSchema,
  kind: ChronologyEntryKindSchema,
  title: z.string(),
  body: z.string().optional(),
  sources: SourcesSchema,
  evidenceId: IdSchema.optional(),
  mediaUrl: z.string().optional(),
  mediaCaption: z.string().optional(),
  artifactName: z.string().optional(),
  gapId: IdSchema.optional(),
});
export type ChronologyEntry = z.infer<typeof ChronologyEntrySchema>;

export const ChronologySchema = z.object({
  phases: z.array(ChronologyPhaseSchema),
  entries: z.array(ChronologyEntrySchema),
});
export type Chronology = z.infer<typeof ChronologySchema>;

/* -------------------------------------------------------------------------- */
/* Idea graph — Live Flowchart                                                 */
/* -------------------------------------------------------------------------- */

export const IdeaKindSchema = z.enum(['observation', 'hypothesis', 'action', 'conclusion']);
export type IdeaKind = z.infer<typeof IdeaKindSchema>;

export const IdeaClusterSchema = z.object({
  id: IdSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  nodeIds: z.array(IdSchema).default([]),
});
export type IdeaCluster = z.infer<typeof IdeaClusterSchema>;

export const IdeaNodeSchema = z.object({
  id: IdSchema,
  clusterId: IdSchema,
  kind: IdeaKindSchema,
  label: z.string(),
  detail: z.string().optional(),
  instant: InstantSchema,
  sources: SourcesSchema,
  /** Renders in the alert palette — a problem node rather than a neutral one. */
  hazard: z.boolean().default(false),
});
export type IdeaNode = z.infer<typeof IdeaNodeSchema>;

export const IdeaRelationSchema = z.enum([
  'leadsTo',
  'confirms',
  'contradicts',
  'refines',
  'branches',
]);
export type IdeaRelation = z.infer<typeof IdeaRelationSchema>;

export const IdeaEdgeSchema = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
  relation: IdeaRelationSchema,
  label: z.string().optional(),
  sources: SourcesSchema,
  /** True when the relationship was inferred rather than stated. */
  inferred: z.boolean().default(false),
});
export type IdeaEdge = z.infer<typeof IdeaEdgeSchema>;

export const AffinityStatusSchema = z.enum(['candidate', 'confirmed', 'rejected', 'gap']);
export type AffinityStatus = z.infer<typeof AffinityStatusSchema>;

/**
 * A cross-cluster proximity finding. `distance` is the laid-out pixel distance
 * between the two nodes; below `threshold` the pair is a candidate, and the
 * model either confirms it with sources or files a gap (acceptance check C17).
 */
export const AffinityLinkSchema = z.object({
  id: IdSchema,
  nodeA: IdSchema,
  nodeB: IdSchema,
  distance: z.number().nullable(),
  threshold: z.number().nullable(),
  statement: z.string(),
  sources: SourcesSchema,
  status: AffinityStatusSchema,
  gapId: IdSchema.optional(),
  confirmedAt: InstantSchema,
});
export type AffinityLink = z.infer<typeof AffinityLinkSchema>;

export const IdeaGraphStatsSchema = z.object({
  nodes: z.number().int(),
  edges: z.number().int(),
  clusters: z.number().int(),
  unified: z.number().int(),
});
export type IdeaGraphStats = z.infer<typeof IdeaGraphStatsSchema>;

export const IdeaGraphSchema = z.object({
  clusters: z.array(IdeaClusterSchema),
  nodes: z.array(IdeaNodeSchema),
  edges: z.array(IdeaEdgeSchema),
  affinities: z.array(AffinityLinkSchema),
});
export type IdeaGraph = z.infer<typeof IdeaGraphSchema>;

/** Append-only operation log backing the idea graph (acceptance checks C12–C18). */
export const GraphOpSchema = z.object({
  id: IdSchema,
  at: z.string(),
  op: z.enum([
    'addNode',
    'updateNode',
    'removeNode',
    'addEdge',
    'updateEdge',
    'removeEdge',
    'addCluster',
    'renameCluster',
    'setAffinity',
  ]),
  /** The committed transcript chunk this operation is grounded in. */
  chunkId: IdSchema.optional(),
  payload: z.record(z.string(), z.unknown()),
});
export type GraphOp = z.infer<typeof GraphOpSchema>;

/* -------------------------------------------------------------------------- */
/* Hardware graph — System Diagrams                                            */
/* -------------------------------------------------------------------------- */

export const HardwareNodeKindSchema = z.enum([
  'supply',
  'regulator',
  'mcu',
  'driver',
  'actuator',
  'sensor',
  'protection',
  'bus',
  'ground',
  'load',
]);
export type HardwareNodeKind = z.infer<typeof HardwareNodeKindSchema>;

export const HardwareNodeSchema = z.object({
  id: IdSchema,
  designator: z.string().optional(),
  name: z.string(),
  kind: HardwareNodeKindSchema,
  value: z.string().optional(),
  sources: SourcesSchema,
  hazard: z.boolean().default(false),
});
export type HardwareNode = z.infer<typeof HardwareNodeSchema>;

export const HardwareEdgeSchema = z.object({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
  net: z.string().optional(),
  signal: z.string().optional(),
  value: z.string().optional(),
  style: z.enum(['solid', 'dashed']).default('solid'),
  label: z.string().optional(),
  sources: SourcesSchema,
  inferred: z.boolean().default(false),
});
export type HardwareEdge = z.infer<typeof HardwareEdgeSchema>;

export const DiagramKindSchema = z.enum([
  'system',
  'power_distribution',
  'build_steps',
  'live_flowchart',
]);
export type DiagramKind = z.infer<typeof DiagramKindSchema>;

export const DiagramParseStatusSchema = z.enum(['valid', 'invalid', 'unvalidated']);
export type DiagramParseStatus = z.infer<typeof DiagramParseStatusSchema>;

export const DiagramSchema = z.object({
  id: IdSchema,
  kind: DiagramKindSchema,
  title: z.string(),
  filename: z.string(),
  mmd: z.string(),
  parseStatus: DiagramParseStatusSchema,
  errors: z.array(z.string()),
  lineCount: z.number().int(),
  /** Evidence ids cited by `%% [source]` annotations inside the diagram. */
  sources: SourcesSchema,
  generatedAt: InstantSchema,
});
export type Diagram = z.infer<typeof DiagramSchema>;

export const HardwareGraphSchema = z.object({
  nodes: z.array(HardwareNodeSchema),
  edges: z.array(HardwareEdgeSchema),
  diagrams: z.array(DiagramSchema),
});
export type HardwareGraph = z.infer<typeof HardwareGraphSchema>;
