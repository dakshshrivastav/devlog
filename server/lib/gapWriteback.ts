/**
 * Gap write-back.
 *
 * Resolving a gap is not just a status flip: the answer becomes evidence, and
 * every structured statement the gap was blocking is updated from it. This is
 * the loop the prototype special-cased for a single hardcoded gap id.
 */
import type { Bom, GapItem, HardwareGraph, IdeaGraph, Incident, Sources } from '../../shared/schema/index';

export interface WriteBackResult {
  bom: Bom;
  hardware: HardwareGraph;
  ideas: IdeaGraph;
  incidents: Incident[];
  touched: string[];
}

function withSource(sources: Sources, evidenceId: string): Sources {
  return sources.includes(evidenceId) ? sources : [...sources, evidenceId];
}

export function applyGapResolution(input: {
  gap: GapItem;
  answer: string;
  evidenceId: string;
  bom: Bom;
  hardware: HardwareGraph;
  ideas: IdeaGraph;
  incidents: Incident[];
}): WriteBackResult {
  const { gap, answer, evidenceId } = input;
  const bom: Bom = { ...input.bom, items: input.bom.items.map((i) => ({ ...i })) };
  const hardware: HardwareGraph = {
    ...input.hardware,
    nodes: input.hardware.nodes.map((n) => ({ ...n })),
    edges: input.hardware.edges.map((e) => ({ ...e })),
  };
  const ideas: IdeaGraph = {
    ...input.ideas,
    nodes: input.ideas.nodes.map((n) => ({ ...n })),
    edges: input.ideas.edges.map((e) => ({ ...e })),
    affinities: input.ideas.affinities.map((a) => ({ ...a })),
  };
  const incidents = input.incidents.map((i) => ({ ...i }));
  const touched: string[] = [];

  for (const target of gap.appliesTo) {
    switch (target.kind) {
      case 'bom': {
        const item = bom.items.find((i) => i.id === target.id);
        if (!item) break;
        item.sources = withSource(item.sources, evidenceId);
        if (target.field && target.field !== 'spec') {
          item.spec = `${item.spec} · ${target.field}: ${answer}`;
        } else {
          item.spec = `${item.spec} · Verified: ${answer}`;
        }
        if (item.status === 'needs-pn' || item.status === 'unverified') item.status = 'verified';
        item.gapId = undefined;
        touched.push(`bom:${item.designator || item.id}`);
        break;
      }
      case 'hardware': {
        const node = hardware.nodes.find((n) => n.id === target.id);
        if (node) {
          node.sources = withSource(node.sources, evidenceId);
          node.value = target.field ? `${node.value ?? ''} ${target.field}: ${answer}`.trim() : answer;
          touched.push(`hardware:${node.id}`);
          break;
        }
        const edge = hardware.edges.find((e) => e.id === target.id);
        if (edge) {
          edge.sources = withSource(edge.sources, evidenceId);
          edge.value = answer;
          touched.push(`hardware-edge:${edge.id}`);
        }
        break;
      }
      case 'idea': {
        const node = ideas.nodes.find((n) => n.id === target.id);
        if (node) {
          node.sources = withSource(node.sources, evidenceId);
          touched.push(`idea:${node.id}`);
          break;
        }
        const link = ideas.affinities.find((a) => a.id === target.id);
        if (link) {
          link.sources = withSource(link.sources, evidenceId);
          link.status = 'confirmed';
          link.confirmedAt = new Date().toISOString();
          touched.push(`affinity:${link.id}`);
        }
        break;
      }
      case 'incident': {
        const incident = incidents.find((i) => i.id === target.id);
        if (!incident) break;
        incident.sources = withSource(incident.sources, evidenceId);
        if (target.field === 'verification') incident.verification = answer;
        touched.push(`incident:${incident.id}`);
        break;
      }
      case 'artifact':
      case 'chronology':
        touched.push(`${target.kind}:${target.id}`);
        break;
    }
  }

  return { bom, hardware, ideas, incidents, touched };
}

/** Gap numbers are display labels; renumber so they stay contiguous. */
export function renumberGaps(gaps: GapItem[]): GapItem[] {
  return gaps.map((gap, index) => ({ ...gap, number: String(index + 1).padStart(2, '0') }));
}
