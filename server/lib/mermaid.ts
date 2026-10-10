/**
 * Mermaid: serialization and validation.
 *
 * The canonical artifacts are `.mmd` text in a restricted flowchart subset.
 * Diagrams are serialized deterministically from the hardware and idea graphs
 * rather than accepted as free text, which makes two acceptance checks
 * structurally true instead of hoped for:
 *
 *   C8 — every saved Mermaid file parses.
 *   C7 — removing evidence removes the unsupported element.
 *
 * `parseSubset` exists so model-emitted Mermaid (build steps, live flowchart)
 * can be validated and round-tripped into the same graph shape.
 */

export interface ParsedNode {
  id: string;
  label: string;
  classes: string[];
}

export interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
  dashed: boolean;
}

export interface ParsedSubgraph {
  id: string;
  title: string;
  nodeIds: string[];
}

export interface ParsedDiagram {
  direction: 'TD' | 'LR' | 'TB' | 'RL';
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  subgraphs: ParsedSubgraph[];
  /** Source tags lifted from `%% [voice 14:02]` style comments. */
  sources: string[];
  errors: string[];
}

const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/* -------------------------------------------------------------------------- */
/* Serialization helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Mermaid-safe node id. */
export function sanitizeId(raw: string, fallbackPrefix = 'N'): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, `${fallbackPrefix}$1`);
  const id = cleaned || `${fallbackPrefix}0`;
  return ID_PATTERN.test(id) ? id : `${fallbackPrefix}_${id}`;
}

/**
 * Mermaid-safe label. Quotes become `#quot;`, and bracket characters that
 * would terminate the node shape are replaced so the diagram still parses.
 */
export function escapeLabel(raw: string): string {
  return raw
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\|/g, '/')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `%% [voice 14:02] [photo 1]` — the provenance annotation the parser reads back. */
export function sourceComment(tags: readonly string[]): string {
  const unique = [...new Set(tags.filter(Boolean))];
  return unique.length > 0 ? `    %% ${unique.map((t) => `[${t}]`).join(' ')}` : '';
}

function nodeLine(id: string, label: string, indent: string, classes: string[] = []): string[] {
  const lines = [`${indent}${id}["${escapeLabel(label)}"]`];
  if (classes.length > 0) {
    lines.push(`${indent}class ${id} ${classes.join(',')}`);
  }
  return lines;
}

function edgeLine(from: string, to: string, label: string | undefined, dashed: boolean, indent: string): string {
  const arrow = dashed ? '-.->' : '-->';
  const labelPart = label ? `|${escapeLabel(label)}|` : '';
  return `${indent}${from} ${arrow}${labelPart} ${to}`;
}

/* -------------------------------------------------------------------------- */
/* Serializers                                                                 */
/* -------------------------------------------------------------------------- */

export interface SerializableNode {
  id: string;
  name: string;
  value?: string;
  designator?: string;
  hazard?: boolean;
  sources: string[];
}

export interface SerializableEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  value?: string;
  signal?: string;
  net?: string;
  style?: 'solid' | 'dashed';
  sources: string[];
}

export interface SerializeOptions {
  title: string;
  direction?: 'TD' | 'LR';
  generatorNote?: string;
}

/**
 * Hardware fact sheet: one node per physical part, one edge per connection,
 * every element annotated with the evidence that supports it.
 */
export function serializeHardwareDiagram(
  nodes: readonly SerializableNode[],
  edges: readonly SerializableEdge[],
  options: SerializeOptions
): string {
  const lines: string[] = [`flowchart ${options.direction ?? 'TD'}`];
  if (options.generatorNote) lines.push(`    %% ${options.generatorNote}`);
  lines.push(`    %% ${options.title}`);

  const idMap = new Map<string, string>();
  const used = new Set<string>();
  for (const node of nodes) {
    let id = sanitizeId(node.id);
    let suffix = 2;
    while (used.has(id)) id = `${sanitizeId(node.id)}_${suffix++}`;
    used.add(id);
    idMap.set(node.id, id);
  }

  let hazardClassUsed = false;
  for (const node of nodes) {
    const id = idMap.get(node.id)!;
    const comment = sourceComment(node.sources);
    if (comment) lines.push(comment);
    const labelParts = [node.name];
    if (node.designator) labelParts.unshift(`${node.designator}`);
    if (node.value) labelParts.push(node.value);
    const label = labelParts.join(node.designator ? ' · ' : ' — ');
    lines.push(...nodeLine(id, label, '    ', node.hazard ? ['hazard'] : []));
    if (node.hazard) hazardClassUsed = true;
  }

  lines.push('');
  for (const edge of edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue; // C7: no evidence, no element.
    const comment = sourceComment(edge.sources);
    if (comment) lines.push(comment);
    const label = edge.label ?? edge.value ?? edge.signal ?? edge.net;
    lines.push(edgeLine(from, to, label, edge.style === 'dashed', '    '));
  }

  if (hazardClassUsed) {
    lines.push('', '    classDef hazard stroke:#ffb4ab,fill:#2a1a19,color:#ffb4ab;');
  }

  return `${lines.filter((l, i) => !(l === '' && lines[i - 1] === '')).join('\n')}\n`;
}

export interface SerializableCluster {
  id: string;
  title: string;
  subtitle?: string;
  nodeIds: string[];
}

export interface SerializableIdeaNode {
  id: string;
  clusterId: string;
  label: string;
  detail?: string;
  kind: string;
  hazard?: boolean;
  sources: string[];
}

export interface SerializableIdeaEdge {
  from: string;
  to: string;
  relation: string;
  label?: string;
  inferred?: boolean;
  sources: string[];
}

/** Idea graph: clusters become Mermaid subgraphs, affinities become dotted links. */
export function serializeIdeaDiagram(
  clusters: readonly SerializableCluster[],
  nodes: readonly SerializableIdeaNode[],
  edges: readonly SerializableIdeaEdge[],
  affinities: readonly { nodeA: string; nodeB: string; statement?: string; sources: string[] }[],
  options: SerializeOptions
): string {
  const lines: string[] = [`flowchart ${options.direction ?? 'TD'}`];
  if (options.generatorNote) lines.push(`    %% ${options.generatorNote}`);
  lines.push(`    %% ${options.title}`);

  const idMap = new Map<string, string>();
  nodes.forEach((node, index) => idMap.set(node.id, sanitizeId(node.id, `I${index}`)));

  const byCluster = new Map<string, SerializableIdeaNode[]>();
  for (const node of nodes) {
    const list = byCluster.get(node.clusterId) ?? [];
    list.push(node);
    byCluster.set(node.clusterId, list);
  }

  let hazardUsed = false;
  for (const cluster of clusters) {
    const members = byCluster.get(cluster.id) ?? [];
    if (members.length === 0) continue;
    lines.push(`    subgraph ${sanitizeId(cluster.id, 'C')} ["${escapeLabel(cluster.title)}"]`);
    for (const node of members) {
      const comment = sourceComment(node.sources);
      if (comment) lines.push(comment);
      const label = node.detail ? `${node.label} — ${node.detail}` : node.label;
      lines.push(...nodeLine(idMap.get(node.id)!, label, '        ', node.hazard ? ['hazard'] : []));
      if (node.hazard) hazardUsed = true;
    }
    lines.push('    end');
    byCluster.delete(cluster.id);
  }

  // Nodes whose cluster is missing still render, ungrouped.
  for (const [clusterId, members] of byCluster) {
    if (members.length === 0) continue;
    lines.push(`    subgraph ${sanitizeId(clusterId, 'C')} ["${escapeLabel(clusterId)}"]`);
    for (const node of members) {
      lines.push(...nodeLine(idMap.get(node.id)!, node.label, '        '));
    }
    lines.push('    end');
  }

  lines.push('');
  for (const edge of edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue;
    const comment = sourceComment(edge.sources);
    if (comment) lines.push(comment);
    lines.push(edgeLine(from, to, edge.label ?? edge.relation, Boolean(edge.inferred), '    '));
  }

  for (const link of affinities) {
    const a = idMap.get(link.nodeA);
    const b = idMap.get(link.nodeB);
    if (!a || !b) continue;
    const comment = sourceComment(link.sources);
    if (comment) lines.push(comment);
    lines.push(edgeLine(a, b, link.statement, true, '    '));
  }

  if (hazardUsed) {
    lines.push('', '    classDef hazard stroke:#ffb4ab,fill:#2a1a19,color:#ffb4ab;');
  }

  return `${lines.join('\n')}\n`;
}

export interface ChronologyStep {
  id: string;
  title: string;
  instant: string | null;
  sources: string[];
}

/** Build sequence: a strictly linear flowchart in timeline order. */
export function serializeBuildSteps(steps: readonly ChronologyStep[], options: SerializeOptions): string {
  const lines: string[] = [`flowchart ${options.direction ?? 'TD'}`];
  if (options.generatorNote) lines.push(`    %% ${options.generatorNote}`);
  lines.push(`    %% ${options.title}`);

  if (steps.length === 0) {
    lines.push('    S0["No timed evidence recorded yet"]');
    return `${lines.join('\n')}\n`;
  }

  steps.forEach((step, index) => {
    const comment = sourceComment(step.sources);
    if (comment) lines.push(comment);
    const clock = step.instant ? new Date(step.instant).toISOString().slice(11, 16) : null;
    const label = clock ? `${clock} ${step.title}` : step.title;
    lines.push(...nodeLine(`S${index + 1}`, label, '    '));
  });

  for (let i = 1; i < steps.length; i += 1) {
    lines.push(`    S${i} --> S${i + 1}`);
  }

  return `${lines.join('\n')}\n`;
}

/* -------------------------------------------------------------------------- */
/* Parsing / validation                                                        */
/* -------------------------------------------------------------------------- */

const HEADER = /^\s*flowchart\s+(TD|TB|LR|RL)\s*$/;
const SUBGRAPH_OPEN = /^\s*subgraph\s+([A-Za-z0-9_]+)\s*(?:\[\s*"(.*)"\s*\])?\s*$/;
const SUBGRAPH_CLOSE = /^\s*end\s*$/;
const NODE_ONLY = /^\s*([A-Za-z0-9_]+)\s*\[\s*"(.*)"\s*\]\s*$/;
const EDGE =
  /^\s*([A-Za-z0-9_]+)\s*(-\.->|-->)(?:\|\s*(.*?)\s*\|)?\s*([A-Za-z0-9_]+)\s*$/;
const CLASS = /^\s*class\s+([A-Za-z0-9_,\s]+)\s+([A-Za-z0-9_]+)\s*$/;
const CLASSDEF = /^\s*classDef\s+[A-Za-z0-9_]+\s+.+$/;
const COMMENT = /^\s*%%(.*)$/;
const SOURCE_TAG = /\[([^\]]+)\]/g;

/**
 * Validate and parse the restricted subset. Returns structured errors rather
 * than throwing, so the pipeline can retry once and then omit-and-gap.
 */
export function parseSubset(source: string): ParsedDiagram {
  const result: ParsedDiagram = {
    direction: 'TD',
    nodes: [],
    edges: [],
    subgraphs: [],
    sources: [],
    errors: [],
  };

  const lines = source.split('\n');
  const nodeById = new Map<string, ParsedNode>();
  const openSubgraphs: ParsedSubgraph[] = [];
  let sawHeader = false;

  const ensureNode = (id: string, label?: string): void => {
    let node = nodeById.get(id);
    if (!node) {
      node = { id, label: label ?? id, classes: [] };
      nodeById.set(id, node);
      result.nodes.push(node);
    } else if (label !== undefined) {
      node.label = label;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    const lineNo = index + 1;

    if (line === '') continue;

    const comment = line.match(COMMENT);
    if (comment) {
      for (const match of comment[1].matchAll(SOURCE_TAG)) {
        result.sources.push(match[1].trim());
      }
      continue;
    }

    const header = line.match(HEADER);
    if (header) {
      if (sawHeader) result.errors.push(`line ${lineNo}: duplicate flowchart header`);
      sawHeader = true;
      result.direction = header[1] as ParsedDiagram['direction'];
      continue;
    }

    if (!sawHeader) {
      result.errors.push(`line ${lineNo}: content before a "flowchart TD|LR" header`);
      continue;
    }

    if (CLASSDEF.test(line)) continue;

    const classMatch = line.match(CLASS);
    if (classMatch) {
      for (const id of classMatch[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        const node = nodeById.get(id);
        if (!node) result.errors.push(`line ${lineNo}: class applied to unknown node "${id}"`);
        else node.classes.push(classMatch[2]);
      }
      continue;
    }

    const subOpen = line.match(SUBGRAPH_OPEN);
    if (subOpen) {
      const sub: ParsedSubgraph = {
        id: subOpen[1],
        title: subOpen[2] ?? subOpen[1],
        nodeIds: [],
      };
      openSubgraphs.push(sub);
      result.subgraphs.push(sub);
      continue;
    }

    if (SUBGRAPH_CLOSE.test(line)) {
      if (openSubgraphs.length === 0) result.errors.push(`line ${lineNo}: "end" without a subgraph`);
      else openSubgraphs.pop();
      continue;
    }

    const edge = line.match(EDGE);
    if (edge) {
      const [, from, arrow, label, to] = edge;
      ensureNode(from);
      ensureNode(to);
      openSubgraphs.at(-1)?.nodeIds.push(from, to);
      result.edges.push({ from, to, label: label || undefined, dashed: arrow === '-.->' });
      continue;
    }

    const node = line.match(NODE_ONLY);
    if (node) {
      ensureNode(node[1], node[2]);
      openSubgraphs.at(-1)?.nodeIds.push(node[1]);
      continue;
    }

    result.errors.push(`line ${lineNo}: not in the supported flowchart subset — "${line.slice(0, 60)}"`);
  }

  if (!sawHeader) result.errors.push('missing "flowchart TD|LR" header');
  if (openSubgraphs.length > 0) {
    result.errors.push(`${openSubgraphs.length} subgraph(s) left open`);
  }

  // Deduplicate subgraph node ids while preserving order.
  for (const sub of result.subgraphs) {
    sub.nodeIds = [...new Set(sub.nodeIds)];
  }
  result.sources = [...new Set(result.sources)];

  return result;
}

export function isValidMermaid(source: string): boolean {
  return parseSubset(source).errors.length === 0;
}
