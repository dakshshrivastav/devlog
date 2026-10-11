import { describe, expect, it } from 'vitest';
import type { EvidenceItem, ObservationNote } from '../shared/schema';
import { buildTagIndex, normalizeHardware, resolveSources } from '../server/pipeline/synthesize';
import { checkObservations } from '../server/pipeline/validate';

const evidence: EvidenceItem = {
  id: 'ev-voice-1',
  kind: 'voice',
  sourceTag: 'voice 14:02',
  label: 'Relay switched',
  instant: '2026-10-08T14:02:00Z',
  instantIsNaive: false,
  order: 1,
  sources: [],
  verification: 'Scribe transcript',
  voice: { audioId: 'audio-1', span: { startSec: 0, endSec: 2 }, quote: 'Relay switched.' },
};

describe('grounding and factual claim validation', () => {
  it('resolves exact evidence source tags and rejects invented citations', () => {
    const index = buildTagIndex([evidence]);
    expect(resolveSources(['voice 14:02', 'voice 99:99'], index)).toEqual({
      ids: ['ev-voice-1'],
      dropped: ['voice 99:99'],
    });
  });

  it('drops unsourced hardware nodes and edges during normalization', () => {
    const report = { droppedCitations: [] as string[], droppedStatements: [] as string[] };
    const normalized = normalizeHardware(
      {
        nodes: [
          { id: 'mcu', name: 'ESP32', kind: 'mcu', sources: ['voice 14:02'] },
          { id: 'invented', name: 'Unknown regulator', kind: 'regulator', sources: ['voice 99:99'] },
        ],
        edges: [
          { from: 'mcu', to: 'invented', label: 'feeds', sources: ['voice 14:02'] },
        ],
        measurements: [],
      },
      buildTagIndex([evidence]),
      report
    );
    expect(normalized.nodes.map((node) => node.id)).toEqual(['mcu']);
    expect(normalized.edges).toEqual([]);
    expect(report.droppedCitations).toContain('voice 99:99');
    expect(report.droppedStatements.some((text) => text.includes('invented'))).toBe(true);
  });

  it('drops an incomplete measurement without discarding the sourced hardware graph', () => {
    const report = { droppedCitations: [] as string[], droppedStatements: [] as string[] };
    const normalized = normalizeHardware(
      {
        nodes: [{ id: 'mcu', name: 'ESP32', kind: 'mcu', sources: ['voice 14:02'] }],
        edges: [],
        measurements: [{ quantity: 'USB rail', sources: ['voice 14:02'] }],
      },
      buildTagIndex([evidence]),
      report
    );
    expect(normalized.nodes.map((node) => node.id)).toEqual(['mcu']);
    expect(normalized.measurements).toEqual([]);
    expect(report.droppedStatements).toContain('measurement USB rail (missing value)');
  });

  it('rejects first-person observer notes and unsupported motives', () => {
    const note: ObservationNote = {
      id: 'obs-1',
      instant: null,
      timeLabel: 'untimed',
      kind: 'speech',
      title: 'We felt frustrated by the reset.',
      sourceLabel: 'voice 14:02',
      evidenceId: 'ev-voice-1',
    };
    expect(checkObservations([note]).map((issue) => issue.check)).toEqual(['C9', 'C10']);
  });
});
