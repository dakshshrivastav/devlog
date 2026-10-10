/**
 * Empty/default values for every stored structure, so a freshly created draft
 * session loads without special-casing in the UI.
 */
import type {
  Bom,
  Chronology,
  Grounding,
  HardwareGraph,
  IdeaGraph,
  SessionCounts,
  Transcript,
} from '../../shared/schema/index';

export const EMPTY_COUNTS: SessionCounts = {
  voice: 0,
  photo: 0,
  commit: 0,
  note: 0,
  measurement: 0,
  evidence: 0,
};

export const EMPTY_GROUNDING: Grounding = {
  sourced: 0,
  unsourced: 0,
  percent: 0,
};

export function emptyChronology(): Chronology {
  return { phases: [], entries: [] };
}

export function emptyIdeaGraph(): IdeaGraph {
  return { clusters: [], nodes: [], edges: [], affinities: [] };
}

export function emptyHardwareGraph(): HardwareGraph {
  return { nodes: [], edges: [], diagrams: [] };
}

export function emptyBom(): Bom {
  return {
    items: [],
    tools: [],
    stats: { items: 0, verified: 0, needsPn: 0, percentVerified: 0 },
  };
}

export function emptyTranscript(): Transcript {
  return {
    provider: 'none',
    segments: [],
    wordTimingAvailable: false,
  };
}
