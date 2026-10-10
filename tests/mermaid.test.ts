import { describe, expect, it } from 'vitest';
import { parseSubset, serializeHardwareDiagram } from '../server/lib/mermaid';

describe('restricted Mermaid contract', () => {
  it('serializes source-backed hardware facts into parseable Mermaid', () => {
    const source = serializeHardwareDiagram(
      [
        { id: 'supply-5v', name: '5 V supply rail', value: '5 V DC', sources: ['voice 14:02'] },
        { id: 'relay-coil', name: 'Relay coil', sources: ['photo 1'] },
      ],
      [
        { id: 'edge-1', from: 'supply-5v', to: 'relay-coil', label: 'coil supply', sources: ['voice 14:02'] },
      ],
      { title: 'Power path', direction: 'LR' }
    );

    const parsed = parseSubset(source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.direction).toBe('LR');
    expect(parsed.nodes.map((node) => node.label)).toContain('5 V supply rail — 5 V DC');
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.sources).toEqual(['voice 14:02', 'photo 1']);
  });

  it('rejects unsupported Mermaid syntax rather than silently saving it', () => {
    const parsed = parseSubset('flowchart TD\n    A --> B\n    click A "https://example.com"');
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]).toContain('not in the supported flowchart subset');
  });
});
