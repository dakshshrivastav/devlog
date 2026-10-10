/**
 * Search across sessions.
 *
 * Replaces the prototype's hardcoded 8-entry catalog: every result points at a
 * real stored object and the view that renders it.
 */
import { Router, type Request, type Response } from 'express';
import type { SearchResult, SessionBundle } from '../../shared/schema/index';
import { loadBundle, listSessions } from '../store/sessionStore';

export const searchRouter = Router();

const ICONS = {
  evidence: {
    voice: 'mic',
    photo: 'photo_camera',
    commit: 'commit',
    note: 'edit_note',
    measurement: 'speed',
  },
  observation: 'visibility',
  bom: 'memory',
  tool: 'precision_manufacturing',
  gap: 'help_outline',
  artifact: 'description',
  idea: 'hub',
  hardware: 'schema',
  incident: 'build_circle',
} as const;

const VIEW_FOR = {
  evidence: 'timeline',
  observation: 'observations',
  bom: 'bom-and-parts',
  tool: 'bom-and-parts',
  gap: 'observations',
  artifact: 'finished-docs',
  idea: 'live-flowchart',
  hardware: 'system-diagrams',
  incident: 'troubleshooting',
} as const;

function score(haystack: string, needle: string): number {
  const text = haystack.toLowerCase();
  if (text === needle) return 6;
  if (text.startsWith(needle)) return 4;
  if (text.includes(needle)) return 2;
  return 0;
}

function collect(bundle: SessionBundle, needle: string): SearchResult[] {
  const out: SearchResult[] = [];
  const sessionId = bundle.session.id;

  const push = (
    id: string,
    kind: SearchResult['kind'],
    title: string,
    subtitle: string | undefined,
    icon: string,
    category: string,
    weight: number
  ): void => {
    const titleScore = score(title, needle);
    const subtitleScore = subtitle ? score(subtitle, needle) : 0;
    const total = titleScore * 2 + subtitleScore + weight;
    if (total <= 0) return;
    out.push({
      id: `${sessionId}:${kind}:${id}`,
      kind,
      title,
      subtitle,
      icon,
      category,
      targetView: VIEW_FOR[kind],
      sessionId,
      score: total,
    });
  };

  for (const item of bundle.evidence) {
    const icon =
      item.kind === 'voice'
        ? ICONS.evidence.voice
        : item.kind === 'photo'
          ? ICONS.evidence.photo
          : item.kind === 'commit'
            ? ICONS.evidence.commit
            : item.kind === 'measurement'
              ? ICONS.evidence.measurement
              : ICONS.evidence.note;
    push(
      item.id,
      'evidence',
      item.label,
      item.detail ?? item.verification,
      icon,
      `Evidence · ${item.sourceTag}`,
      0
    );
  }

  for (const note of bundle.observations) {
    push(note.id, 'observation', note.title, note.body, ICONS.observation, `Observation · ${note.timeLabel}`, 0);
  }

  for (const item of bundle.bom.items) {
    push(item.id, 'bom', `${item.designator} ${item.name}`, item.spec, ICONS.bom, 'Bill of materials', 0);
  }

  for (const tool of bundle.bom.tools) {
    push(tool.id, 'tool', tool.name, tool.description, ICONS.tool, 'Bench tool', 0);
  }

  for (const gap of bundle.gaps) {
    push(
      gap.id,
      'gap',
      gap.question,
      `${gap.status} · ${gap.targetDoc}`,
      ICONS.gap,
      `Gap ${gap.number}`,
      gap.status === 'open' ? 1 : 0
    );
  }

  for (const artifact of bundle.artifacts) {
    push(artifact.id, 'artifact', artifact.name, artifact.summary, ICONS.artifact, 'Artifact', 0);
  }

  for (const node of bundle.ideas.nodes) {
    push(node.id, 'idea', node.label, node.detail, ICONS.idea, `Idea · ${node.kind}`, 0);
  }

  for (const node of bundle.hardware.nodes) {
    push(
      node.id,
      'hardware',
      `${node.designator ? `${node.designator} · ` : ''}${node.name}`,
      node.value,
      ICONS.hardware,
      `Hardware · ${node.kind}`,
      0
    );
  }

  for (const incident of bundle.incidents) {
    push(incident.id, 'incident', incident.title, incident.symptom, ICONS.incident, `Incident ${incident.number}`, 0);
  }

  return out.map((item) => ({
    ...item,
    category: `${bundle.session.name} · ${item.category}`,
  }));
}

searchRouter.get('/', async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : null;

  if (query.length === 0) {
    res.json({ query, results: [] satisfies SearchResult[] });
    return;
  }

  const sessions = await listSessions();
  const scoped = sessionId ? sessions.filter((s) => s.id === sessionId) : sessions;
  const needle = query.toLowerCase();

  const results: SearchResult[] = [];
  for (const session of scoped) {
    try {
      const bundle = await loadBundle(session.id);
      results.push(...collect(bundle, needle));
    } catch (err) {
      console.warn(`[search] skipping ${session.id}:`, (err as Error).message);
    }
  }

  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title));
  res.json({ query, results: results.slice(0, 60) });
});
