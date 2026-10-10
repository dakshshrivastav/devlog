import { describe, expect, it } from 'vitest';
import { compareTimeable, sortTimeable } from '../shared/timeline';

describe('session timeline ordering', () => {
  it('orders aware instants first, then naive EXIF, then untimed evidence', () => {
    const entries = [
      { id: 'untimed', instant: null, order: 0 },
      { id: 'naive', instant: '2026-10-08T08:00:00', instantIsNaive: true, order: 0 },
      { id: 'aware-late', instant: '2026-10-08T14:10:00Z', instantIsNaive: false, order: 0 },
      { id: 'aware-early', instant: '2026-10-08T14:02:00Z', instantIsNaive: false, order: 0 },
    ];
    expect(sortTimeable(entries).map((entry) => entry.id)).toEqual([
      'aware-early',
      'aware-late',
      'naive',
      'untimed',
    ]);
  });

  it('uses a stable order index before the source id for tied timestamps', () => {
    expect(
      sortTimeable([
        { id: 'later-source', instant: '2026-10-08T14:00:00Z', order: 2 },
        { id: 'earlier-order', instant: '2026-10-08T14:00:00Z', order: 1 },
      ]).map((entry) => entry.id)
    ).toEqual(['earlier-order', 'later-source']);
    expect(compareTimeable({ id: 'a', instant: null }, { id: 'b', instant: null })).toBeLessThan(0);
  });
});
