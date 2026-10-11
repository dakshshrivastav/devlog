/**
 * Synthesis: evidence in, structured knowledge out.
 *
 * Each artifact family gets its own call so one failure cannot take the whole
 * session down. The model never sees internal ids — it cites the same source
 * tags the UI shows (`voice 14:02`, `photo 2`, `commit c4e12a`), and every
 * citation is resolved back to an evidence id here. A citation that does not
 * resolve is dropped, and a statement left with no sources is discarded rather
 * than kept as an ungrounded claim (acceptance checks C1 and C2).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type {
  EvidenceItem,
  HardwareEdge,
  HardwareNode,
  IdeaCluster,
  IdeaEdge,
  IdeaGraph,
  IdeaNode,
  MeasurementPayload,
  Session,
} from '../../shared/schema/index';
import { config } from '../config';
import { generateJson, type ImageInput } from '../providers/gemini';
import { HttpError } from '../lib/errors';
import { formatClock } from '../../shared/format';

/* -------------------------------------------------------------------------- */
/* Prompts                                                                     */
/* -------------------------------------------------------------------------- */

const PROMPT_DIR = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..', 'prompts');

const promptCache = new Map<string, string>();

export async function loadPrompt(name: string, vars: Record<string, string> = {}): Promise<string> {
  let template = promptCache.get(name);
  if (!template) {
    template = await readFile(path.join(PROMPT_DIR, `${name}.md`), 'utf8');
    promptCache.set(name, template);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

/* -------------------------------------------------------------------------- */
/* Source-tag resolution                                                       */
/* -------------------------------------------------------------------------- */

export interface TagIndex {
  byTag: Map<string, string>;
  all: string[];
}

export function buildTagIndex(evidence: readonly EvidenceItem[]): TagIndex {
  const byTag = new Map<string, string>();
  for (const item of evidence) {
    byTag.set(item.sourceTag.toLowerCase(), item.id);
    if (item.commit) byTag.set(item.commit.hash.toLowerCase(), item.id);
  }
  return { byTag, all: evidence.map((e) => e.sourceTag) };
}

/** Resolve model citations to real evidence ids, dropping anything fabricated. */
export function resolveSources(
  tags: readonly string[] | undefined,
  index: TagIndex
): { ids: string[]; dropped: string[] } {
  const ids: string[] = [];
  const dropped: string[] = [];
  for (const raw of tags ?? []) {
    const key = raw.trim().toLowerCase().replace(/^\[|\]$/g, '');
    const id = index.byTag.get(key);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else if (key) {
      dropped.push(raw.trim());
    }
  }
  return { ids, dropped };
}

/* -------------------------------------------------------------------------- */
/* Evidence rendering for prompts                                              */
/* -------------------------------------------------------------------------- */

export function renderEvidenceForPrompt(evidence: readonly EvidenceItem[]): string {
  if (evidence.length === 0) return '(no evidence recorded)';
  return evidence
    .map((item) => {
      const clock = item.instant ? formatClock(item.instant) : 'untimed';
      const body =
        item.kind === 'voice'
          ? (item.voice?.quote ?? item.detail ?? item.label)
          : item.kind === 'commit'
            ? `${item.commit?.subject ?? item.label}${
                item.commit?.diff?.length
                  ? `\n      diff (${item.commit.diffFile ?? ''}):\n${item.commit.diff
                      .slice(0, 8)
                      .map((l) => `        ${l.kind === 'added' ? '+' : l.kind === 'removed' ? '-' : ' '} ${l.content}`)
                      .join('\n')}`
              : ''
            }`
            : item.kind === 'measurement'
              ? `${item.measurement?.quantity ?? item.label} = ${item.measurement?.value ?? '?'}${
                  item.measurement?.unit ?? ''
                }`
              : (item.detail ?? item.label);
      return `  [${item.sourceTag}] (${item.kind}, ${clock}) ${body}`;
    })
    .join('\n');
}

export function renderTagList(index: TagIndex): string {
  return index.all.length > 0 ? index.all.map((t) => `[${t}]`).join(' ') : '(none)';
}

/* -------------------------------------------------------------------------- */
/* Output schemas (what the model returns, before resolution)                  */
/* -------------------------------------------------------------------------- */

const citation = z.array(z.string()).default([]);

export const ObservationsOutputSchema = z.object({
  observations: z.array(
    z.object({
      kind: z.enum(['speech', 'photo', 'commit', 'note']),
      timeLabel: z.string(),
      title: z.string(),
      body: z.string().optional(),
      tag: z.string().optional(),
      sources: citation,
    })
  ),
});
export type ObservationsOutput = z.infer<typeof ObservationsOutputSchema>;

export const HardwareOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      designator: z.string().optional(),
      name: z.string(),
      kind: z.enum([
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
      ]),
      value: z.string().optional(),
      hazard: z.boolean().optional(),
      sources: citation,
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      net: z.string().optional(),
      signal: z.string().optional(),
      value: z.string().optional(),
      label: z.string().optional(),
      dashed: z.boolean().optional(),
      inferred: z.boolean().optional(),
      sources: citation,
    })
  ),
  measurements: z.array(
    z.object({
      quantity: z.string(),
      value: z.string().optional(),
      unit: z.string().optional(),
      instrument: z.string().optional(),
      role: z.enum(['baseline', 'event', 'threshold', 'result']).optional(),
      sources: citation,
    })
  ),
});
export type HardwareOutput = z.infer<typeof HardwareOutputSchema>;

export const BomOutputSchema = z.object({
  items: z.array(
    z.object({
      designator: z.string(),
      name: z.string(),
      spec: z.string(),
      qty: z.number().int().min(1).default(1),
      status: z.enum(['verified', 'needs-pn', 'installed', 'unverified']).default('unverified'),
      missing: z.string().optional(),
      sources: citation,
    })
  ),
  tools: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      description: z.string(),
      specs: z.string().optional(),
      icon: z.string().optional(),
      sources: citation,
    })
  ),
});
export type BomOutput = z.infer<typeof BomOutputSchema>;

export const IncidentsOutputSchema = z.object({
  incidents: z.array(
    z.object({
      title: z.string(),
      level: z.enum(['hardware', 'firmware', 'wiring', 'environmental']).default('hardware'),
      status: z.enum(['open', 'resolved']).default('open'),
      phase: z.string().optional(),
      detectedTag: z.string().optional(),
      resolvedTag: z.string().optional(),
      telemetryTarget: z.string().optional(),
      symptom: z.string(),
      measurements: z.array(
        z.object({ label: z.string(), value: z.string(), sources: citation })
      ).default([]),
      rootCause: z.string(),
      fix: z.string(),
      verification: z.string().optional(),
      rulesLearned: z.array(
        z.object({ title: z.string(), body: z.string(), sources: citation })
      ).default([]),
      relatedCommitTags: z.array(z.string()).default([]),
      sources: citation,
    })
  ),
});
export type IncidentsOutput = z.infer<typeof IncidentsOutputSchema>;

export const IdeasOutputSchema = z.object({
  clusters: z.array(
    z.object({ id: z.string(), title: z.string(), subtitle: z.string().optional() })
  ),
  nodes: z.array(
    z.object({
      id: z.string(),
      clusterId: z.string(),
      kind: z.enum(['observation', 'hypothesis', 'action', 'conclusion']),
      label: z.string(),
      detail: z.string().optional(),
      hazard: z.boolean().optional(),
      timeTag: z.string().optional(),
      sources: citation,
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      relation: z.enum(['leadsTo', 'confirms', 'contradicts', 'refines', 'branches']),
      label: z.string().optional(),
      inferred: z.boolean().optional(),
      sources: citation,
    })
  ),
  affinityCandidates: z.array(
    z.object({ nodeA: z.string(), nodeB: z.string(), why: z.string(), sources: citation })
  ).default([]),
});
export type IdeasOutput = z.infer<typeof IdeasOutputSchema>;

export const ChronologyOutputSchema = z.object({
  phases: z.array(
    z.object({ id: z.string(), title: z.string(), summary: z.string().optional() })
  ),
  entries: z.array(
    z.object({
      phaseId: z.string(),
      lane: z.string(),
      kind: z.enum(['note', 'evidence', 'artifact', 'milestone', 'gap']).default('note'),
      timeTag: z.string().optional(),
      title: z.string(),
      body: z.string().optional(),
      sources: citation,
    })
  ),
});
export type ChronologyOutput = z.infer<typeof ChronologyOutputSchema>;

export const GapsOutputSchema = z.object({
  gaps: z.array(
    z.object({
      question: z.string(),
      description: z.string(),
      targetDoc: z.string(),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      placeholder: z.string().optional(),
      appliesTo: z
        .array(
          z.object({
            kind: z.enum(['bom', 'hardware', 'idea', 'incident', 'artifact', 'chronology']),
            /** Designator, node id, incident number or filename — resolved server-side. */
            ref: z.string(),
            field: z.string().optional(),
          })
        )
        .default([]),
    })
  ),
});
export type GapsOutput = z.infer<typeof GapsOutputSchema>;

export const ReadmeProseSchema = z.object({
  title: z.string(),
  standfirst: z.string().optional(),
  overview: z.string().optional(),
  architecture: z.string().optional(),
  troubleshooting: z.string().optional(),
});
export type ReadmeProseOutput = z.infer<typeof ReadmeProseSchema>;

/* -------------------------------------------------------------------------- */
/* Calls                                                                       */
/* -------------------------------------------------------------------------- */

export interface SynthesisContext {
  session: Session;
  evidence: readonly EvidenceItem[];
  index: TagIndex;
  images: readonly ImageInput[];
}

export class SynthesisError extends Error {
  constructor(
    readonly artifact: string,
    message: string
  ) {
    super(message);
    this.name = 'SynthesisError';
  }
}

async function callJson<T>(
  ctx: SynthesisContext,
  promptName: string,
  schema: z.ZodType<T>,
  vars: Record<string, string> = {},
  withImages = false
): Promise<{ data: T; attempts: number }> {
  const prompt = await loadPrompt(promptName, {
    evidence: renderEvidenceForPrompt(ctx.evidence),
    tags: renderTagList(ctx.index),
    sessionName: ctx.session.name,
    ...vars,
  });
  try {
    return await generateJson(prompt, schema, withImages ? ctx.images : [], {
      temperature: 0.15,
    });
  } catch (err) {
    if (err instanceof HttpError) throw new SynthesisError(promptName, err.message);
    throw new SynthesisError(promptName, (err as Error).message);
  }
}

export async function synthesizeObservations(
  ctx: SynthesisContext,
  correction = '(none)'
): Promise<{ data: ObservationsOutput; attempts: number }> {
  return callJson(ctx, 'observations', ObservationsOutputSchema, { correction }, true);
}

export async function synthesizeHardware(
  ctx: SynthesisContext
): Promise<{ data: HardwareOutput; attempts: number }> {
  return callJson(ctx, 'hardware', HardwareOutputSchema, {}, true);
}

export async function synthesizeBom(
  ctx: SynthesisContext
): Promise<{ data: BomOutput; attempts: number }> {
  return callJson(ctx, 'bom', BomOutputSchema, {}, true);
}

export async function synthesizeIncidents(
  ctx: SynthesisContext,
  observationsSummary: string
): Promise<{ data: IncidentsOutput; attempts: number }> {
  return callJson(ctx, 'incidents', IncidentsOutputSchema, { observations: observationsSummary });
}

export async function synthesizeIdeas(
  ctx: SynthesisContext,
  existingGraph?: IdeaGraph,
  proximityPairs = '(none calculated yet)'
): Promise<{ data: IdeasOutput; attempts: number }> {
  return callJson(ctx, 'ideas', IdeasOutputSchema, {
    existingGraph: existingGraph ? JSON.stringify(existingGraph) : '(none yet)',
    proximityPairs,
  });
}

export async function synthesizeChronology(
  ctx: SynthesisContext
): Promise<{ data: ChronologyOutput; attempts: number }> {
  return callJson(ctx, 'chronology', ChronologyOutputSchema);
}

export async function synthesizeGaps(
  ctx: SynthesisContext,
  knownMissing: string,
  targets: string
): Promise<{ data: GapsOutput; attempts: number }> {
  return callJson(ctx, 'gaps', GapsOutputSchema, { knownMissing, targets });
}

export async function synthesizeReadmeProse(
  ctx: SynthesisContext,
  facts: string,
  correction = '(none)'
): Promise<{ data: ReadmeProseOutput; attempts: number }> {
  const prompt = await loadPrompt('readme', {
    evidence: renderEvidenceForPrompt(ctx.evidence),
    tags: renderTagList(ctx.index),
    sessionName: ctx.session.name,
    facts,
    correction,
  });
  try {
    return await generateJson(prompt, ReadmeProseSchema, [], { temperature: 0.3 });
  } catch (err) {
    throw new SynthesisError('readme', err instanceof Error ? err.message : 'README prose failed.');
  }
}

/* -------------------------------------------------------------------------- */
/* Normalizers: model output → stored entities                                 */
/* -------------------------------------------------------------------------- */

export interface NormalizeReport {
  droppedCitations: string[];
  droppedStatements: string[];
}

export function normalizeHardware(
  output: HardwareOutput,
  index: TagIndex,
  report: NormalizeReport
): { nodes: HardwareNode[]; edges: HardwareEdge[]; measurements: MeasurementPayload[]; measurementSources: string[][] } {
  const nodes: HardwareNode[] = [];
  const seenNodeIds = new Set<string>();

  for (const raw of output.nodes) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (ids.length === 0) {
      report.droppedStatements.push(`node ${raw.id || raw.name}`);
      continue; // C1: no source, no element.
    }
    const id = raw.id.trim() || `hw-${nodes.length + 1}`;
    if (seenNodeIds.has(id)) continue;
    seenNodeIds.add(id);
    nodes.push({
      id,
      designator: raw.designator?.trim() || undefined,
      name: raw.name.trim(),
      kind: raw.kind,
      value: raw.value?.trim() || undefined,
      sources: ids,
      hazard: raw.hazard ?? false,
    });
  }

  const edges: HardwareEdge[] = [];
  for (const [i, raw] of output.edges.entries()) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (!seenNodeIds.has(raw.from) || !seenNodeIds.has(raw.to)) {
      report.droppedStatements.push(`edge ${raw.from}->${raw.to} (unknown node)`);
      continue;
    }
    if (ids.length === 0) {
      report.droppedStatements.push(`edge ${raw.from}->${raw.to}`);
      continue;
    }
    edges.push({
      id: `hw-edge-${i + 1}`,
      from: raw.from,
      to: raw.to,
      net: raw.net?.trim() || undefined,
      signal: raw.signal?.trim() || undefined,
      value: raw.value?.trim() || undefined,
      style: raw.dashed ? 'dashed' : 'solid',
      label: raw.label?.trim() || undefined,
      sources: ids,
      inferred: raw.inferred ?? false,
    });
  }

  const measurements: MeasurementPayload[] = [];
  const measurementSources: string[][] = [];
  for (const raw of output.measurements) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (!raw.value?.trim()) {
      report.droppedStatements.push(`measurement ${raw.quantity} (missing value)`);
      continue;
    }
    if (ids.length === 0) {
      report.droppedStatements.push(`measurement ${raw.quantity}`);
      continue;
    }
    measurements.push({
      quantity: raw.quantity.trim(),
      value: raw.value.trim(),
      unit: raw.unit?.trim() || undefined,
      instrument: raw.instrument?.trim() || undefined,
      role: raw.role,
    });
    measurementSources.push(ids);
  }

  return { nodes, edges, measurements, measurementSources };
}

export function normalizeIdeas(
  output: IdeasOutput,
  index: TagIndex,
  evidenceById: ReadonlyMap<string, EvidenceItem>,
  report: NormalizeReport
): { clusters: IdeaCluster[]; nodes: IdeaNode[]; edges: IdeaEdge[]; affinities: IdeaGraph['affinities'] } {
  const clusters: IdeaCluster[] = output.clusters.map((c, i) => ({
    id: c.id.trim() || `cluster-${i + 1}`,
    title: c.title.trim(),
    subtitle: c.subtitle?.trim() || undefined,
    nodeIds: [],
  }));
  const clusterIds = new Set(clusters.map((c) => c.id));

  const nodes: IdeaNode[] = [];
  const nodeIds = new Set<string>();
  for (const [i, raw] of output.nodes.entries()) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (ids.length === 0) {
      report.droppedStatements.push(`idea ${raw.id || raw.label}`);
      continue;
    }
    const id = raw.id.trim() || `idea-${i + 1}`;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);

    let clusterId = clusterIds.has(raw.clusterId) ? raw.clusterId : clusters[0]?.id;
    if (!clusterId) {
      clusterId = 'cluster-1';
      clusters.push({ id: clusterId, title: 'Session', nodeIds: [] });
      clusterIds.add(clusterId);
    }

    const timeEvidenceId = raw.timeTag ? resolveSources([raw.timeTag], index).ids[0] : undefined;
    const timeEvidence = timeEvidenceId ? evidenceById.get(timeEvidenceId) : undefined;
    nodes.push({
      id,
      clusterId,
      kind: raw.kind,
      label: raw.label.trim(),
      detail: raw.detail?.trim() || undefined,
      instant: timeEvidence?.instant ?? null,
      sources: ids,
      hazard: raw.hazard ?? false,
    });
    clusters.find((c) => c.id === clusterId)?.nodeIds.push(id);
  }

  const edges: IdeaEdge[] = [];
  for (const raw of output.edges) {
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    if (!nodeIds.has(raw.from) || !nodeIds.has(raw.to)) {
      report.droppedStatements.push(`idea edge ${raw.from}->${raw.to} (unknown node)`);
      continue;
    }
    if (ids.length === 0) {
      report.droppedStatements.push(`idea edge ${raw.from}->${raw.to}`);
      continue;
    }
    edges.push({
      id: `idea-edge-${stablePart(raw.from)}-${raw.relation}-${stablePart(raw.to)}`,
      from: raw.from,
      to: raw.to,
      relation: raw.relation,
      label: raw.label?.trim() || undefined,
      sources: ids,
      inferred: raw.inferred ?? false,
    });
  }

  const affinities: IdeaGraph['affinities'] = [];
  for (const raw of output.affinityCandidates) {
    if (!nodeIds.has(raw.nodeA) || !nodeIds.has(raw.nodeB)) {
      report.droppedStatements.push(`affinity ${raw.nodeA}<->${raw.nodeB} (unknown node)`);
      continue;
    }
    const { ids, dropped } = resolveSources(raw.sources, index);
    report.droppedCitations.push(...dropped);
    affinities.push({
      id: `affinity-${stablePart(raw.nodeA)}-${stablePart(raw.nodeB)}`,
      nodeA: raw.nodeA,
      nodeB: raw.nodeB,
      distance: null,
      threshold: null,
      statement: raw.why.trim(),
      sources: ids,
      status: ids.length > 0 ? 'confirmed' : 'candidate',
      confirmedAt: ids.length > 0 ? new Date().toISOString() : null,
    });
  }

  return { clusters, nodes, edges, affinities };
}

function stablePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node';
}

/** Merge a model's new graph view onto the append-only live state. */
export function mergeIdeaGraphs(previous: IdeaGraph, incoming: IdeaGraph): IdeaGraph {
  const clusters = new Map(previous.clusters.map((item) => [item.id, item]));
  for (const cluster of incoming.clusters) {
    const old = clusters.get(cluster.id);
    clusters.set(cluster.id, old ? { ...old, ...cluster } : cluster);
  }
  const nodes = new Map(previous.nodes.map((item) => [item.id, item]));
  for (const node of incoming.nodes) nodes.set(node.id, { ...nodes.get(node.id), ...node });
  const edges = new Map(previous.edges.map((item) => [item.id, item]));
  for (const edge of incoming.edges) edges.set(edge.id, { ...edges.get(edge.id), ...edge });
  const affinities = new Map(previous.affinities.map((item) => [item.id, item]));
  for (const affinity of incoming.affinities) affinities.set(affinity.id, { ...affinities.get(affinity.id), ...affinity });

  const mergedNodes = [...nodes.values()];
  const mergedClusters = [...clusters.values()].map((cluster) => ({
    ...cluster,
    nodeIds: mergedNodes.filter((node) => node.clusterId === cluster.id).map((node) => node.id),
  }));
  return {
    clusters: mergedClusters,
    nodes: mergedNodes,
    edges: [...edges.values()].filter((edge) => nodes.has(edge.from) && nodes.has(edge.to)),
    affinities: [...affinities.values()].filter((link) => nodes.has(link.nodeA) && nodes.has(link.nodeB)),
  };
}

export function providerLabel(): string {
  const provider = config.gemini.authMode === 'vertex-adc' ? 'Vertex AI ADC' : 'Gemini Developer API';
  return `${provider} · ${config.gemini.model}`;
}
