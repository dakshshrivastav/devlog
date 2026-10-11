/** Debounced, evidence-grounded live idea-graph updates. */
import { customAlphabet } from 'nanoid';
import dagre from '@dagrejs/dagre';
import type { Artifact, GraphOp, IdeaGraph } from '../../shared/schema/index';
import { GraphOpSchema } from '../../shared/schema/index';
import { config } from '../config';
import { emit } from '../lib/runs';
import { parseSubset, serializeIdeaDiagram } from '../lib/mermaid';
import { buildTagIndex, mergeIdeaGraphs, normalizeIdeas, synthesizeIdeas, type NormalizeReport, type SynthesisContext } from './synthesize';
import { appendJsonl, ensureSessionDirs, loadBundle, statArtifact, writeArtifacts, writeJson, writeText, FILES } from '../store/sessionStore';

const makeId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 9);
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const running = new Map<string, Promise<void>>();
const DEBOUNCE_MS = 1400;

export function scheduleLiveIdeaSynthesis(sessionId: string): void {
  if (config.mock || !config.gemini.available) return;
  const old = timers.get(sessionId);
  if (old) clearTimeout(old);
  timers.set(sessionId, setTimeout(() => {
    timers.delete(sessionId);
    void synthesizeLiveIdeas(sessionId);
  }, DEBOUNCE_MS));
}

export async function flushLiveIdeaSynthesis(sessionId: string): Promise<void> {
  if (config.mock || !config.gemini.available) return;
  const timer = timers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(sessionId);
  }
  await synthesizeLiveIdeas(sessionId);
}

async function synthesizeLiveIdeas(sessionId: string): Promise<void> {
  const inFlight = running.get(sessionId);
  if (inFlight) return inFlight;
  const task = synthesizeOnce(sessionId).finally(() => running.delete(sessionId));
  running.set(sessionId, task);
  return task;
}

async function synthesizeOnce(sessionId: string): Promise<void> {
  try {
    const bundle = await loadBundle(sessionId);
    if (!bundle.evidence.some((item) => item.kind === 'voice')) return;
    const index = buildTagIndex(bundle.evidence);
    const context: SynthesisContext = { session: bundle.session, evidence: bundle.evidence, index, images: [] };
    const proximityPairs = describeNearPairs(bundle.ideas);
    const result = await synthesizeIdeas(context, bundle.ideas, proximityPairs);
    const report: NormalizeReport = { droppedCitations: [], droppedStatements: [] };
    const normalized = normalizeIdeas(result.data, index, new Map(bundle.evidence.map((e) => [e.id, e])), report);
    const next: IdeaGraph = mergeIdeaGraphs(bundle.ideas, {
      clusters: normalized.clusters,
      nodes: normalized.nodes,
      edges: normalized.edges,
      affinities: normalized.affinities,
    });

    const latestChunkId = bundle.transcript?.segments.at(-1)?.id;
    const ops = diffGraph(bundle.ideas, next, latestChunkId);
    if (ops.length) await appendJsonl(sessionId, FILES.ideasHistory, ops);
    await writeJson(sessionId, FILES.ideasGraph, next);
    await writeIdeaDiagram(sessionId, next, bundle.evidence);

    await emit(sessionId, 'graph', {
      message: `Live idea graph updated · ${next.nodes.length} nodes · ${next.edges.length} relations · ${next.affinities.filter((a) => a.status === 'confirmed').length} confirmed cross-cluster links.`,
    });
    if (report.droppedCitations.length || report.droppedStatements.length) {
      await emit(sessionId, 'log', {
        message: `Live synthesis discarded ${report.droppedCitations.length} unknown citation(s) and ${report.droppedStatements.length} unsupported idea(s).`,
        level: 'warn',
      });
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Live idea synthesis failed.';
    // Live transcript is already on disk; this failure only delays the graph.
    await emit(sessionId, 'log', { message: `Live idea graph update failed: ${message}`, level: 'warn' });
  }
}

function describeNearPairs(graph: IdeaGraph): string {
  if (graph.nodes.length < 2) return '(no cross-cluster pairs yet)';
  const layout = new dagre.graphlib.Graph({ compound: false, multigraph: true });
  layout.setGraph({ rankdir: 'LR', nodesep: 38, ranksep: 90, marginx: 32, marginy: 38 });
  layout.setDefaultEdgeLabel(() => ({}));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) layout.setNode(node.id, { width: 216, height: node.detail ? 88 : 72 });
  for (const edge of graph.edges) {
    if (nodesById.has(edge.from) && nodesById.has(edge.to)) layout.setEdge(edge.from, edge.to);
  }
  dagre.layout(layout);

  const candidates: { distance: number; a: string; b: string }[] = [];
  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const a = graph.nodes[i];
      const b = graph.nodes[j];
      if (a.clusterId === b.clusterId) continue;
      const pa = layout.node(a.id) as { x: number; y: number };
      const pb = layout.node(b.id) as { x: number; y: number };
      const distance = Math.round(Math.hypot(pa.x - pb.x, pa.y - pb.y));
      if (distance < 330) candidates.push({ distance, a: a.id, b: b.id });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, 10).map(({ distance, a, b }) => {
    const left = nodesById.get(a)!;
    const right = nodesById.get(b)!;
    return `${a} (${left.label}, cluster ${left.clusterId}) ↔ ${b} (${right.label}, cluster ${right.clusterId}) · ${distance}px`;
  }).join('\n') || '(no cross-cluster pairs within 330 layout pixels)';
}

function diffGraph(previous: IdeaGraph, next: IdeaGraph, chunkId?: string): GraphOp[] {
  const at = new Date().toISOString();
  const ops: GraphOp[] = [];
  const add = (op: GraphOp['op'], payload: Record<string, unknown>) => {
    ops.push(GraphOpSchema.parse({ id: makeId(), at, op, ...(chunkId ? { chunkId } : {}), payload }));
  };
  const oldClusters = new Map(previous.clusters.map((item) => [item.id, item]));
  const oldNodes = new Map(previous.nodes.map((item) => [item.id, item]));
  const oldEdges = new Map(previous.edges.map((item) => [item.id, item]));
  const oldAffinities = new Map(previous.affinities.map((item) => [item.id, item]));

  for (const cluster of next.clusters) {
    const old = oldClusters.get(cluster.id);
    if (!old) add('addCluster', { cluster });
    else if (old.title !== cluster.title || old.subtitle !== cluster.subtitle) add('renameCluster', { id: cluster.id, title: cluster.title, subtitle: cluster.subtitle });
  }
  for (const node of next.nodes) {
    const old = oldNodes.get(node.id);
    if (!old) add('addNode', { node });
    else if (JSON.stringify(old) !== JSON.stringify(node)) add('updateNode', { node });
  }
  for (const edge of next.edges) {
    const old = oldEdges.get(edge.id);
    if (!old) add('addEdge', { edge });
    else if (JSON.stringify(old) !== JSON.stringify(edge)) add('updateEdge', { edge });
  }
  for (const affinity of next.affinities) {
    const old = oldAffinities.get(affinity.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(affinity)) add('setAffinity', { affinity });
  }
  return ops;
}

async function writeIdeaDiagram(
  sessionId: string,
  ideas: IdeaGraph,
  evidence: { id: string; sourceTag: string }[]
): Promise<void> {
  if (ideas.nodes.length === 0) return;
  const sourceTags = new Map(evidence.map((item) => [item.id, item.sourceTag]));
  const toTags = (sources: readonly string[]) => [...new Set(sources.map((id) => sourceTags.get(id)).filter((v): v is string => Boolean(v)))];
  const mmd = serializeIdeaDiagram(
    ideas.clusters,
    ideas.nodes.map((node) => ({ ...node, sources: toTags(node.sources) })),
    ideas.edges.map((edge) => ({ ...edge, sources: toTags(edge.sources) })),
    ideas.affinities.filter((affinity) => affinity.status === 'confirmed').map((link) => ({ ...link, sources: toTags(link.sources) })),
    { title: 'Live idea graph', direction: 'TD', generatorNote: `Incremental synthesis · ${ideas.nodes.length} ideas` }
  );
  const parsed = parseSubset(mmd);
  if (parsed.errors.length) throw new Error(`Live Mermaid output failed validation: ${parsed.errors[0]}`);

  const filePath = 'artifacts/diagrams/live_flowchart.mmd';
  await ensureSessionDirs(sessionId);
  await writeText(sessionId, filePath, mmd);
  const stat = await statArtifact(sessionId, filePath);
  const bundle = await loadBundle(sessionId);
  const generatedAt = new Date().toISOString();
  const diagram = {
    id: 'diagram-live_flowchart',
    kind: 'live_flowchart' as const,
    title: 'Live idea graph',
    filename: 'live_flowchart.mmd',
    mmd,
    parseStatus: 'valid' as const,
    errors: [],
    lineCount: mmd.split('\n').filter((line) => line.trim()).length,
    sources: [...new Set([...ideas.nodes.flatMap((n) => n.sources), ...ideas.edges.flatMap((e) => e.sources)])],
    generatedAt,
  };
  await writeJson(sessionId, FILES.hardwareGraph, {
    ...bundle.hardware,
    diagrams: [...bundle.hardware.diagrams.filter((item) => item.kind !== 'live_flowchart'), diagram],
  });

  const artifacts: Artifact[] = [...bundle.artifacts.filter((item) => item.name !== 'diagrams/live_flowchart.mmd')];
  artifacts.push({
    id: 'artifact-diagrams-live-flowchart-mmd',
    name: 'diagrams/live_flowchart.mmd',
    path: filePath,
    kind: 'mermaid',
    kindLabel: 'idea graph',
    title: 'Live idea graph',
    summary: `${parsed.nodes.length} idea nodes · ${parsed.edges.length} relations · parses clean`,
    status: 'validated',
    statusLabel: 'Validated',
    bytes: stat?.bytes,
    hash: stat?.hash,
    sources: diagram.sources,
    gapIds: [],
    generatedAt,
    targetView: 'live-flowchart',
  });
  await writeArtifacts(sessionId, artifacts);
}
