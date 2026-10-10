/**
 * Shared formatting helpers. Pure and isomorphic — safe in the browser and in
 * the server. All clock labels are UTC, matching the EXIF and commit evidence
 * the pipeline records.
 */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `868` → `14m 28s`. Returns an em dash when there is nothing to report. */
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec < 0) return '\u2014';
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${pad2(secs)}s`;
}

/** True when an ISO string carries no zone designator — typically raw EXIF. */
const NAIVE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;

/**
 * Wall-clock parts of an instant, in UTC.
 *
 * A timezone-naive value (EXIF without an offset) is read straight off the
 * string. Passing it through `Date.parse` would interpret it as local time and
 * shift the displayed hour by the machine's UTC offset.
 */
function clockParts(instant: string): { h: number; m: number; s: number } | null {
  if (NAIVE.test(instant)) {
    const match = instant.match(/[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    return {
      h: Number.parseInt(match[1], 10),
      m: Number.parseInt(match[2], 10),
      s: match[3] ? Number.parseInt(match[3], 10) : 0,
    };
  }
  const ms = Date.parse(instant);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  return { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() };
}

/** `2026-10-11T14:02:19.000Z` → `14:02`. Em dash when untimed. */
export function formatClock(instant: string | null | undefined): string {
  if (!instant) return '\u2014';
  const parts = clockParts(instant);
  return parts ? `${pad2(parts.h)}:${pad2(parts.m)}` : '\u2014';
}

/** `14:02:19` including seconds, for EXIF-style verification labels. */
export function formatClockSeconds(instant: string | null | undefined): string {
  if (!instant) return '\u2014';
  const parts = clockParts(instant);
  return parts ? `${pad2(parts.h)}:${pad2(parts.m)}:${pad2(parts.s)}` : '\u2014';
}

export function formatPercent(ratioOrPercent: number, digits = 0): string {
  if (!Number.isFinite(ratioOrPercent)) return '\u2014';
  return `${ratioOrPercent.toFixed(digits)}%`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** `1` → `01`, `12` → `12`. For the editorial stat tiles. */
export function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '\u2014';
  return pad2(Math.trunc(n));
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}\u2026`;
}

/** Relative label for run events, e.g. `just now`, `4m ago`. */
export function formatRelative(instant: string | null | undefined, now = Date.now()): string {
  if (!instant) return '\u2014';
  const ms = Date.parse(instant);
  if (Number.isNaN(ms)) return '\u2014';
  const deltaSec = Math.round((now - ms) / 1000);
  if (deltaSec < 5) return 'just now';
  if (deltaSec < 60) return `${deltaSec}s ago`;
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86400)}d ago`;
}
