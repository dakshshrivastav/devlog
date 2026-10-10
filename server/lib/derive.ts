/**
 * Derived statistics.
 *
 * Every count, percentage and total in the UI is computed here from the stored
 * evidence rather than persisted as a claim about itself. This is what removes
 * the prototype's "8 sources" label sitting above a 6-item timeline.
 */
import type {
  BomItem,
  BomStats,
  Cost,
  EvidenceItem,
  Grounding,
  SessionCounts,
  Sources,
} from '../../shared/schema/index';

export function computeCounts(evidence: readonly EvidenceItem[]): SessionCounts {
  const counts: SessionCounts = {
    voice: 0,
    photo: 0,
    commit: 0,
    note: 0,
    measurement: 0,
    evidence: evidence.length,
  };
  for (const item of evidence) counts[item.kind] += 1;
  return counts;
}

/**
 * Grounding is measured over every structured statement the pipeline produced:
 * BOM rows, bench tools, hardware nodes and edges, idea nodes and edges,
 * observations, incidents, bench rules and measurements. A statement counts as
 * sourced when it cites at least one evidence id.
 */
export interface GroundingInput {
  bomItems?: readonly BomItem[];
  sourced?: readonly Sources[];
}

export function computeGrounding(statementSources: readonly Sources[]): Grounding {
  const sourced = statementSources.filter((s) => s.length > 0).length;
  const unsourced = statementSources.length - sourced;
  const percent =
    statementSources.length === 0 ? 0 : Math.round((sourced / statementSources.length) * 1000) / 10;
  return { sourced, unsourced, percent };
}

export function computeBomStats(items: readonly BomItem[]): BomStats {
  const verified = items.filter((i) => i.status === 'verified' || i.status === 'installed').length;
  const needsPn = items.filter((i) => i.status === 'needs-pn' || i.status === 'unverified').length;
  const percentVerified = items.length === 0 ? 0 : Math.round((verified / items.length) * 1000) / 10;

  const costs = items.map((i) => i.unitCost).filter((c): c is Cost => c !== undefined);
  const totalCost =
    costs.length === items.length && items.length > 0
      ? {
          amount:
            Math.round(
              items.reduce((sum, i) => sum + (i.unitCost?.amount ?? 0) * i.qty, 0) * 100
            ) / 100,
          currency: costs[0].currency,
          sources: [] as string[],
        }
      : undefined;

  return { items: items.length, verified, needsPn, percentVerified, totalCost };
}

export function countMermaidLines(mmd: string): number {
  return mmd.split('\n').filter((line) => line.trim().length > 0).length;
}

/** `3 voice · 2 photo · 3 git`, built from real counts and omitting zeros. */
export function formatEvidenceBreakdown(counts: SessionCounts): string {
  const parts: string[] = [];
  if (counts.voice > 0) parts.push(`${counts.voice} voice`);
  if (counts.photo > 0) parts.push(`${counts.photo} photo${counts.photo === 1 ? '' : 's'}`);
  if (counts.commit > 0) parts.push(`${counts.commit} git commit${counts.commit === 1 ? '' : 's'}`);
  if (counts.measurement > 0) {
    parts.push(`${counts.measurement} measurement${counts.measurement === 1 ? '' : 's'}`);
  }
  if (counts.note > 0) parts.push(`${counts.note} note${counts.note === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' · ') : 'no evidence yet';
}
