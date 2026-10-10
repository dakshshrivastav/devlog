/**
 * Artifact regeneration.
 *
 * One function turns the structured session state into every file in the
 * documentation bundle: deterministic markdown, serialized Mermaid diagrams,
 * and the artifact index the UI renders. Called after a pipeline run and after
 * every gap resolution, so the exported bundle never drifts from the data.
 *
 * A diagram that fails validation is never written. It is omitted and reported,
 * per ACTION_PLAN Milestone 1 step 7.
 */
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  Artifact,
  ArtifactKind,
  Diagram,
  GapItem,
  Session,
} from '../../shared/schema/index';
import { ActiveViewSchema } from '../../shared/schema/index';
import {
  FILES,
  loadBundle,
  pathsFor,
  saveSession,
  statArtifact,
  writeArtifacts,
  writeJson,
  writeText,
} from '../store/sessionStore';
import {
  parseSubset,
  serializeBuildSteps,
  serializeHardwareDiagram,
  serializeIdeaDiagram,
} from './mermaid';
import {
  renderBomMd,
  renderGapsMd,
  renderIndexMd,
  renderObserverNotesMd,
  renderReadmeMd,
  renderTroubleshootingMd,
  type ReadmeProse,
} from './render/markdown';
import { countMermaidLines } from './derive';
import { sortTimeable } from '../../shared/timeline';

const POWER_KINDS = new Set(['supply', 'regulator', 'protection', 'ground', 'load']);

export interface RegenerateOptions {
  /** Model-authored README narrative. Omitted sections fall back to structure only. */
  prose?: ReadmeProse | null;
}

interface PendingFile {
  name: string;
  rel: string;
  kind: ArtifactKind;
  kindLabel: string;
  title: string;
  summary: string;
  status: Artifact['status'];
  statusLabel: string;
  sources: string[];
  targetView: string;
  body: string;
  omitted: boolean;
}

function targetViewFor(name: string): string {
  if (name.endsWith('.mmd')) return 'system-diagrams';
  if (name === 'BOM.md') return 'bom-and-parts';
  if (name === 'TROUBLESHOOTING.md') return 'troubleshooting';
  if (name === 'OBSERVER_NOTES.md' || name === 'GAPS.md') return 'observations';
  return 'finished-docs';
}

function validateTargetView(value: string): string {
  const parsed = ActiveViewSchema.safeParse(value);
  return parsed.success ? parsed.data : 'finished-docs';
}

function uniqueSources(lists: readonly (readonly string[])[]): string[] {
  return [...new Set(lists.flat())];
}

/**
 * Mermaid provenance comments are read by humans, so they carry source tags
 * (`voice 14:02`) rather than internal evidence ids. The stored
 * `Diagram.sources` keeps the ids.
 */
function tagMapper(evidence: readonly { id: string; sourceTag: string }[]) {
  const byId = new Map(evidence.map((e) => [e.id, e.sourceTag]));
  const toTags = (ids: readonly string[]): string[] =>
    [...new Set(ids.map((id) => byId.get(id)).filter((t): t is string => Boolean(t)))];
  return { toTags };
}

function gapsFor(artifactName: string, gaps: readonly GapItem[]): string[] {
  return gaps
    .filter(
      (g) =>
        g.status === 'open' &&
        g.appliesTo.some((t) => t.kind === 'artifact' && t.id === artifactName)
    )
    .map((g) => g.id);
}

function readmeTitle(session: Session, prose: ReadmeProse | null): string {
  return prose?.title?.trim() || session.name;
}

export async function regenerateArtifacts(
  sessionId: string,
  options: RegenerateOptions = {}
): Promise<Artifact[]> {
  const bundle = await loadBundle(sessionId);
  const { session, evidence, bom, gaps, incidents, observations, hardware, ideas, chronology } = bundle;
  const openGapCount = gaps.filter((g) => g.status === 'open').length;
  const now = new Date().toISOString();
  const paths = pathsFor(sessionId);

  await mkdir(path.join(paths.artifacts, 'diagrams'), { recursive: true });

  const pending: PendingFile[] = [];
  const diagrams: Diagram[] = [];

  const addMarkdown = (
    name: string,
    body: string,
    meta: {
      title: string;
      summary: string;
      kindLabel: string;
      needsInput?: boolean;
      sources?: string[];
    }
  ): void => {
    pending.push({
      name,
      rel: path.join('artifacts', name),
      kind: 'markdown',
      kindLabel: meta.kindLabel,
      title: meta.title,
      summary: meta.summary,
      status: meta.needsInput ? 'needs-input' : 'ready',
      statusLabel: meta.needsInput ? 'Needs input' : 'Ready',
      sources: meta.sources ?? [],
      targetView: targetViewFor(name),
      body,
      omitted: false,
    });
  };

  const addDiagram = (
    kind: Diagram['kind'],
    filename: string,
    title: string,
    mmd: string,
    sources: string[]
  ): void => {
    const parsed = parseSubset(mmd);
    const rel = path.join('artifacts', 'diagrams', filename);
    const name = `diagrams/${filename}`;
    const invalid = parsed.errors.length > 0;

    if (invalid) {
      // Never persist malformed Mermaid.
      diagrams.push({
        id: `diagram-${kind}`,
        kind,
        title,
        filename,
        mmd: '',
        parseStatus: 'invalid',
        errors: parsed.errors,
        lineCount: 0,
        sources,
        generatedAt: now,
      });
    } else {
      diagrams.push({
        id: `diagram-${kind}`,
        kind,
        title,
        filename,
        mmd,
        parseStatus: 'valid',
        errors: [],
        lineCount: countMermaidLines(mmd),
        sources,
        generatedAt: now,
      });
    }

    pending.push({
      name,
      rel,
      kind: 'mermaid',
      kindLabel: 'schematic',
      title,
      summary: invalid
        ? `Omitted — ${parsed.errors[0]}`
        : `${parsed.nodes.length} nodes · ${parsed.edges.length} edges · parses clean`,
      status: invalid ? 'failed' : 'validated',
      statusLabel: invalid ? 'Omitted' : 'Validated',
      sources,
      targetView: targetViewFor(name),
      body: mmd,
      omitted: invalid,
    });
  };

  /* ------------------------------ markdown ------------------------------ */

  const readmeBody = renderReadmeMd({
    prose: options.prose ?? null,
    session,
    evidence,
    bom,
    hardware,
    incidents,
    artifacts: [],
  });

  addMarkdown('README.md', readmeBody, {
    title: readmeTitle(session, options.prose ?? null),
    summary:
      incidents.length > 0
        ? `${incidents.filter((i) => i.status === 'resolved').length} of ${incidents.length} incident${
            incidents.length === 1 ? '' : 's'
          } resolved`
        : 'Project overview and hardware summary',
    kindLabel: 'doc/root',
  });

  addMarkdown('BOM.md', renderBomMd(bom, session, evidence), {
    title: 'Bill of Materials',
    summary: `${bom.stats.items} item${bom.stats.items === 1 ? '' : 's'} cataloged, ${
      bom.stats.needsPn
    } pending clarification`,
    kindLabel: 'parts',
    needsInput: bom.items.some((i) => i.gapId !== undefined),
    sources: uniqueSources(bom.items.map((i) => i.sources)),
  });

  addMarkdown('OBSERVER_NOTES.md', renderObserverNotesMd(observations, session, evidence), {
    title: 'Observer Notes',
    summary: `${observations.length} chronological third-person observation${
      observations.length === 1 ? '' : 's'
    }`,
    kindLabel: 'logs',
    sources: observations.map((o) => o.evidenceId).filter((v): v is string => Boolean(v)),
  });

  addMarkdown('TROUBLESHOOTING.md', renderTroubleshootingMd(incidents, session, evidence), {
    title: 'Troubleshooting',
    summary:
      incidents.length === 0
        ? 'No incidents recorded'
        : `${incidents.filter((i) => i.status === 'resolved').length} of ${incidents.length} resolved`,
    kindLabel: 'diagnostics',
    needsInput: incidents.some((i) => i.status === 'open'),
    sources: uniqueSources(incidents.map((i) => i.sources)),
  });

  addMarkdown('GAPS.md', renderGapsMd(gaps, session, evidence), {
    title: 'Gaps',
    summary:
      openGapCount > 0
        ? `${openGapCount} targeted question${openGapCount === 1 ? '' : 's'} remaining`
        : 'No open questions',
    kindLabel: 'attention',
    needsInput: openGapCount > 0,
  });

  /* ------------------------------ diagrams ------------------------------ */

  const generatorNote = `Synthesized from ${session.counts.evidence} evidence items in session ${session.slug}`;
  const { toTags } = tagMapper(evidence);
  const taggedHardwareNodes = hardware.nodes.map((n) => ({ ...n, sources: toTags(n.sources) }));
  const taggedHardwareEdges = hardware.edges.map((e) => ({ ...e, sources: toTags(e.sources) }));

  if (hardware.nodes.length > 0) {
    addDiagram(
      'system',
      'system.mmd',
      'System architecture',
      serializeHardwareDiagram(taggedHardwareNodes, taggedHardwareEdges, {
        title: 'System architecture',
        direction: 'TD',
        generatorNote,
      }),
      uniqueSources([
        ...hardware.nodes.map((n) => n.sources),
        ...hardware.edges.map((e) => e.sources),
      ])
    );

    const powerNodes = hardware.nodes.filter((n) => POWER_KINDS.has(n.kind));
    const powerIds = new Set(powerNodes.map((n) => n.id));
    const powerEdges = hardware.edges.filter((e) => powerIds.has(e.from) || powerIds.has(e.to));
    if (powerNodes.length > 0) {
      addDiagram(
        'power_distribution',
        'power_distribution.mmd',
        'Power distribution',
        serializeHardwareDiagram(
          powerNodes.map((n) => ({ ...n, sources: toTags(n.sources) })),
          powerEdges.map((e) => ({ ...e, sources: toTags(e.sources) })),
          {
            title: 'Power distribution rails',
            direction: 'LR',
            generatorNote,
          }
        ),
        uniqueSources([
          ...powerNodes.map((n) => n.sources),
          ...powerEdges.map((e) => e.sources),
        ])
      );
    }
  }

  const steps = sortTimeable(
    chronology.entries
      .filter((e) => e.instant !== null)
      .map((e) => ({ id: e.id, title: e.title, instant: e.instant, sources: e.sources }))
  );
  if (steps.length > 0) {
    addDiagram(
      'build_steps',
      'build_steps.mmd',
      'Build sequence',
      serializeBuildSteps(
      steps.map((s) => ({ ...s, sources: toTags(s.sources) })),
      { title: 'Build sequence', direction: 'TD', generatorNote }
    ),
      uniqueSources(steps.map((s) => s.sources))
    );
  }

  if (ideas.nodes.length > 0) {
    addDiagram(
      'live_flowchart',
      'live_flowchart.mmd',
      'Idea graph',
      serializeIdeaDiagram(
        ideas.clusters,
        ideas.nodes.map((n) => ({ ...n, sources: toTags(n.sources) })),
        ideas.edges.map((e) => ({ ...e, sources: toTags(e.sources) })),
        ideas.affinities
          .filter((link) => link.status === 'confirmed')
          .map((link) => ({ ...link, sources: toTags(link.sources) })),
        { title: 'Idea graph', direction: 'TD', generatorNote }
      ),
      uniqueSources([
        ...ideas.nodes.map((n) => n.sources),
        ...ideas.edges.map((e) => e.sources),
      ])
    );
  }

  /* -------------------------------- write ------------------------------- */

  for (const file of pending) {
    if (file.omitted) continue;
    await writeText(sessionId, file.rel, file.body);
  }

  const artifacts: Artifact[] = [];
  for (const file of pending) {
    const stats = file.omitted ? null : await statArtifact(sessionId, file.rel);
    artifacts.push({
      id: `artifact-${file.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      name: file.name,
      path: file.rel,
      kind: file.kind,
      kindLabel: file.kindLabel,
      title: file.title,
      summary: file.summary,
      status: file.status,
      statusLabel: file.statusLabel,
      bytes: stats?.bytes,
      hash: stats?.hash,
      sources: file.sources,
      gapIds: gapsFor(file.name, gaps),
      generatedAt: now,
      targetView: validateTargetView(file.targetView),
    });
  }

  // Persist the derived stats so the session list agrees with the bundle.
  await saveSession(session);

  await writeText(sessionId, path.join('artifacts', 'INDEX.md'), renderIndexMd(session, artifacts));
  await writeArtifacts(sessionId, artifacts);
  await writeJson(sessionId, FILES.hardwareGraph, { ...hardware, diagrams });

  return artifacts;
}
