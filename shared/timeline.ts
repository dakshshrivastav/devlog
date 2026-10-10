/**
 * Timeline ordering policy.
 *
 * Implemented exactly as recorded in ACTION_PLAN §3:
 *
 *   1. Timezone-aware items sort by normalized UTC instant.
 *   2. Timezone-naive values (typically EXIF) remain naive and sort *after*
 *      every aware instant.
 *   3. Untimed evidence sorts after dated evidence.
 *   4. Ties break by the stable `order` index, then by source id.
 *
 * Speech-to-commit association is deliberately not attempted in v1.
 */
import type { EvidenceItem } from './schema/core';

export interface Timeable {
  id: string;
  instant: string | null;
  instantIsNaive?: boolean;
  order?: number;
}

/** Rank: aware instants first, then naive, then untimed. */
function timeRank(item: Timeable): number {
  if (!item.instant) return 2;
  return item.instantIsNaive ? 1 : 0;
}

export function compareTimeable(a: Timeable, b: Timeable): number {
  const rankDiff = timeRank(a) - timeRank(b);
  if (rankDiff !== 0) return rankDiff;

  if (a.instant && b.instant) {
    const at = Date.parse(a.instant);
    const bt = Date.parse(b.instant);
    if (!Number.isNaN(at) && !Number.isNaN(bt) && at !== bt) return at - bt;
  }

  const orderDiff = (a.order ?? 0) - (b.order ?? 0);
  if (orderDiff !== 0) return orderDiff;

  return a.id.localeCompare(b.id);
}

export function sortTimeable<T extends Timeable>(items: readonly T[]): T[] {
  return [...items].sort(compareTimeable);
}

export function sortEvidence(items: readonly EvidenceItem[]): EvidenceItem[] {
  return sortTimeable(items);
}

/**
 * How many evidence items carry a usable instant. Reported honestly rather
 * than claiming every item is time-anchored.
 */
export function timedRatio(items: readonly Timeable[]): number {
  if (items.length === 0) return 0;
  const timed = items.filter((i) => i.instant !== null).length;
  return timed / items.length;
}

/**
 * Session window from the evidence itself.
 *
 * Only timezone-aware instants define the window. A naive EXIF timestamp has no
 * offset, so `Date.parse` would read it as local time and stretch the window by
 * the machine's UTC offset — a fabricated duration. Naive items still sort and
 * display; they simply do not set the session's start or end.
 *
 * Returns null when nothing is timed, so the UI renders an empty state instead
 * of a made-up duration.
 */
export function evidenceWindow(
  items: readonly EvidenceItem[]
): { start: string; end: string; durationSec: number; naiveCount: number } | null {
  let naiveCount = 0;
  const instants: number[] = [];

  for (const item of items) {
    if (!item.instant) continue;
    if (item.instantIsNaive) {
      naiveCount += 1;
      continue;
    }
    const ms = Date.parse(item.instant);
    if (!Number.isNaN(ms)) instants.push(ms);
  }

  if (instants.length === 0) return null;

  const start = Math.min(...instants);
  const end = Math.max(...instants);
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    durationSec: Math.round((end - start) / 1000),
    naiveCount,
  };
}
