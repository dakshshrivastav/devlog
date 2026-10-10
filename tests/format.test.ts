import { describe, expect, it } from 'vitest';
import { formatClock, formatClockSeconds, formatDuration } from '../shared/format';

describe('evidence time formatting', () => {
  it('keeps timezone-naive EXIF wall-clock values unshifted', () => {
    expect(formatClock('2026-10-08T14:08:19')).toBe('14:08');
    expect(formatClockSeconds('2026-10-08T14:08:19')).toBe('14:08:19');
  });

  it('formats aware UTC timestamps and known durations', () => {
    expect(formatClock('2026-10-08T14:08:19.000Z')).toBe('14:08');
    expect(formatDuration(1069)).toBe('17m 49s');
    expect(formatDuration(null)).toBe('—');
  });
});
