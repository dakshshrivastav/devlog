import { describe, expect, it } from 'vitest';
import { allocateFrames } from '../server/pipeline/video';

describe('video frame budget', () => {
  it('distributes the bounded sample budget evenly across videos', () => {
    expect(allocateFrames(1, 4)).toEqual([4]);
    expect(allocateFrames(2, 4)).toEqual([2, 2]);
    expect(allocateFrames(3, 4)).toEqual([2, 1, 1]);
    expect(allocateFrames(5, 4)).toEqual([1, 1, 1, 1, 0]);
  });

  it('returns no frame work for an empty capture or disabled limit', () => {
    expect(allocateFrames(0, 4)).toEqual([]);
    expect(allocateFrames(2, 0)).toEqual([]);
  });
});
