/**
 * EXIF extraction for bench photos.
 *
 * Timestamps from EXIF are usually timezone-naive. We keep them naive and mark
 * them as such, because pretending they are UTC would be a lie the timeline
 * policy explicitly forbids (ACTION_PLAN §3).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import exifr from 'exifr';

export interface PhotoExif {
  /** ISO string built from the EXIF datetime, naive (no timezone suffix). */
  takenAt: string | null;
  /** True when EXIF carried no offset information. */
  naive: boolean;
  device: string | null;
}

interface RawExif {
  DateTimeOriginal?: Date | string;
  CreateDate?: Date | string;
  ModifyDate?: Date | string;
  Make?: string;
  Model?: string;
  OffsetTimeOriginal?: string;
  OffsetTime?: string;
}

/**
 * EXIF datetimes are local wall-clock with no zone unless an OffsetTime tag is
 * present. When there is no offset we render the naive instant without a `Z`
 * so the timeline can sort it after aware instants.
 */
function naiveIso(value: Date | string | undefined, offset: string | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(Date.parse(value));
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const local =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return offset ? `${local}${offset}` : local;
}

export async function readPhotoExif(filePath: string): Promise<PhotoExif> {
  try {
    const buffer = await readFile(filePath);
    const parsed = (await exifr.parse(buffer, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'Make', 'Model', 'OffsetTimeOriginal', 'OffsetTime'],
    })) as RawExif | undefined;

    if (!parsed) return { takenAt: null, naive: true, device: null };

    const taken = parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.ModifyDate;
    const offset = parsed.OffsetTimeOriginal ?? parsed.OffsetTime;
    const iso = naiveIso(taken, offset);
    const device = [parsed.Make, parsed.Model].filter(Boolean).join(' ').trim() || null;

    return {
      takenAt: iso,
      naive: !offset,
      device: device ?? `${path.basename(filePath)} (no EXIF device tag)`,
    };
  } catch (err) {
    console.warn(`[exif] could not read ${path.basename(filePath)}:`, (err as Error).message);
    return { takenAt: null, naive: true, device: null };
  }
}

/** Best-effort ISO instant for sorting; naive values are returned as-is. */
export function exifToSortableInstant(exif: PhotoExif): string | null {
  if (!exif.takenAt) return null;
  if (!exif.naive) {
    const parsed = Date.parse(exif.takenAt);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  // Naive: keep the wall-clock string; the timeline ranks it below aware instants.
  return exif.takenAt;
}
