/**
 * Timeline assembly.
 *
 * Turns stored captures — audio transcripts, photos, notes, git commits — into
 * evidence items with stable ids, source tags and honest timestamps. Nothing
 * here calls a model; it is deterministic and testable.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { EvidenceItem, Transcript, TranscriptSegment } from '../../shared/schema/index';
import { sortTimeable } from '../../shared/timeline';
import { formatClock, formatClockSeconds } from '../../shared/format';
import type { SessionPaths } from '../store/sessionStore';
import { exifToSortableInstant, readPhotoExif } from '../providers/exif';
import { readCommitDiff, type GitRepoInfo } from '../providers/git';

const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif']);
const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.aac', '.opus']);
const DIFF_BUDGET = 6;

async function listFiles(dir: string, allowed: Set<string>): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries
    .filter((name) => allowed.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => path.join(dir, name));
}

function mediaIdOf(filePath: string): string {
  return path.parse(path.basename(filePath)).name;
}

/* -------------------------------------------------------------------------- */
/* Voice                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Transcript spans are audio-relative. The file's mtime is the moment the
 * recording finished, so a segment's wall-clock instant is derived by walking
 * back from that anchor by the remaining audio duration. The derivation is
 * recorded in `verification` rather than presented as provider timing.
 */
function voiceEvidence(
  transcript: Transcript,
  audioFiles: { file: string; mtimeMs: number }[]
): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const byAudio = new Map<string, TranscriptSegment[]>();
  for (const segment of transcript.segments) {
    const list = byAudio.get(segment.audioId) ?? [];
    list.push(segment);
    byAudio.set(segment.audioId, list);
  }

  let voiceIndex = 0;
  for (const { file, mtimeMs } of audioFiles) {
    const audioId = mediaIdOf(file);
    const segments = (byAudio.get(audioId) ?? []).sort((a, b) => a.start - b.start);
    const totalDuration = segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0;

    if (segments.length === 0) {
      voiceIndex += 1;
      items.push({
        id: `ev-${audioId}`,
        kind: 'voice',
        sourceTag: `voice ${voiceIndex}`,
        label: `Untranscribed recording ${audioId}`,
        instant: new Date(mtimeMs).toISOString(),
        instantIsNaive: false,
        order: voiceIndex,
        sources: [],
        verification: 'Audio stored; no transcript available for this file',
        voice: { audioId, span: { startSec: 0, endSec: 0 } },
      });
      continue;
    }

    for (const segment of segments) {
      voiceIndex += 1;
      const offsetFromEnd = Math.max(0, totalDuration - segment.start);
      const instant = new Date(mtimeMs - offsetFromEnd * 1000).toISOString();
      items.push({
        id: `ev-${segment.id}`,
        kind: 'voice',
        sourceTag: `voice ${formatClock(instant)}`,
        label: firstSentence(segment.text),
        detail: segment.text,
        instant,
        instantIsNaive: false,
        order: voiceIndex,
        sources: [],
        verification: transcript.wordTimingAvailable
          ? `Scribe word timing · ${segment.start.toFixed(1)}s–${segment.end.toFixed(1)}s into ${audioId}`
          : `Segment timing only · ${audioId}`,
        voice: {
          audioId,
          span: { startSec: segment.start, endSec: segment.end },
          quote: segment.text,
          words: segment.words,
          transcriptId: segment.id,
        },
      });
    }
  }
  return items;
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const cut = trimmed.search(/[.!?]\s/);
  const head = cut > 0 ? trimmed.slice(0, cut + 1) : trimmed;
  return head.length > 120 ? `${head.slice(0, 119).trimEnd()}…` : head;
}

/* -------------------------------------------------------------------------- */
/* Photos                                                                      */
/* -------------------------------------------------------------------------- */

async function photoEvidence(
  photosDir: string
): Promise<EvidenceItem[]> {
  const files = await listFiles(photosDir, PHOTO_EXT);
  const items: EvidenceItem[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const mediaId = mediaIdOf(file);
    const info = await stat(file);
    const exif = await readPhotoExif(file);
    const instant = exifToSortableInstant(exif) ?? info.mtime.toISOString();
    const number = index + 1;

    items.push({
      id: `ev-${mediaId}`,
      kind: 'photo',
      sourceTag: `photo ${number}`,
      label: `Bench photo ${number}`,
      detail: exif.device ? `Captured on ${exif.device}` : undefined,
      instant,
      instantIsNaive: exif.naive && exif.takenAt !== null,
      order: number,
      sources: [],
      verification: exif.takenAt
        ? exif.naive
          ? `EXIF ${formatClockSeconds(exif.takenAt)} (timezone-naive)`
          : `EXIF ${formatClockSeconds(exif.takenAt)} UTC`
        : `File modified ${formatClockSeconds(info.mtime.toISOString())} UTC`,
      photo: {
        mediaId,
        url: '', // filled in by the store-aware caller
        caption: undefined,
        exif: {
          takenAt: exif.takenAt,
          device: exif.device,
          note: exif.naive ? 'timezone-naive EXIF' : undefined,
        },
      },
    });
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/* Notes                                                                       */
/* -------------------------------------------------------------------------- */

async function noteEvidence(captureDir: string): Promise<EvidenceItem[]> {
  const file = path.join(captureDir, 'notes.txt');
  if (!existsSync(file)) return [];
  const text = await readFile(file, 'utf8');
  const info = await stat(file);
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return blocks.map((block, index) => ({
    id: `ev-note-${index + 1}`,
    kind: 'note' as const,
    sourceTag: `note ${index + 1}`,
    label: firstSentence(block),
    detail: block,
    instant: new Date(info.mtimeMs - (blocks.length - index - 1) * 1000).toISOString(),
    instantIsNaive: false,
    order: index + 1,
    sources: [],
    verification: 'Typed note from capture/notes.txt',
    note: { text: block, origin: 'capture' as const },
  }));
}

/* -------------------------------------------------------------------------- */
/* Commits                                                                     */
/* -------------------------------------------------------------------------- */

async function commitEvidence(repo: GitRepoInfo | null): Promise<EvidenceItem[]> {
  if (!repo) return [];
  const items: EvidenceItem[] = [];

  for (let index = 0; index < repo.commits.length; index += 1) {
    const commit = repo.commits[index];
    const diff =
      index < DIFF_BUDGET ? await readCommitDiff(repo.path, commit.hash) : null;
    items.push({
      id: `ev-commit-${commit.hash}`,
      kind: 'commit',
      sourceTag: `commit ${commit.hash}`,
      label: commit.subject,
      detail: `${commit.filesChanged} file${commit.filesChanged === 1 ? '' : 's'} changed${
        repo.branch ? ` on ${repo.branch}` : ''
      }`,
      instant: commit.authoredAt || null,
      instantIsNaive: false,
      order: index + 1,
      sources: [],
      verification: `git ${commit.hash}${commit.authoredAt ? ` · ${commit.authoredAt}` : ''}`,
      commit: {
        hash: commit.hash,
        subject: commit.subject,
        branch: repo.branch ?? undefined,
        authoredAt: commit.authoredAt || undefined,
        filesChanged: commit.filesChanged,
        diffFile: diff?.file,
        diff: diff?.lines,
      },
    });
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                    */
/* -------------------------------------------------------------------------- */

export interface BuildEvidenceInput {
  paths: SessionPaths;
  transcript: Transcript | null;
  repo: GitRepoInfo | null;
  sessionId: string;
}

export async function buildEvidence(input: BuildEvidenceInput): Promise<EvidenceItem[]> {
  const { paths, transcript, repo, sessionId } = input;

  const audioFilesRaw = await listFiles(paths.audio, AUDIO_EXT);
  const audioFiles = await Promise.all(
    audioFilesRaw.map(async (file) => ({ file, mtimeMs: (await stat(file)).mtimeMs }))
  );

  const [photos, notes, commits] = await Promise.all([
    photoEvidence(paths.photos),
    noteEvidence(paths.capture),
    commitEvidence(repo),
  ]);

  const voices =
    transcript && transcript.segments.length > 0
      ? voiceEvidence(transcript, audioFiles)
      : audioFiles.map(({ file }, index) => ({
          id: `ev-${mediaIdOf(file)}`,
          kind: 'voice' as const,
          sourceTag: `voice ${index + 1}`,
          label: `Recording ${mediaIdOf(file)} (not transcribed)`,
          instant: null,
          instantIsNaive: false,
          order: index + 1,
          sources: [],
          verification: 'No transcript available',
          voice: { audioId: mediaIdOf(file), span: { startSec: 0, endSec: 0 } },
        }));

  // Photo URLs point back through the API so nothing depends on absolute paths.
  const withUrls = photos.map((item) =>
    item.photo
      ? { ...item, photo: { ...item.photo, url: `/api/sessions/${sessionId}/media/${item.photo.mediaId}` } }
      : item
  );

  const all = [...voices, ...withUrls, ...notes, ...commits];
  const sorted = sortTimeable(all);

  // Re-index so `order` is a dense, stable tie-breaker over the whole timeline.
  return sorted.map((item, index) => ({ ...item, order: index + 1 }));
}

export function summarizeEvidence(evidence: readonly EvidenceItem[]): string {
  const counts = { voice: 0, photo: 0, commit: 0, note: 0, measurement: 0 };
  for (const item of evidence) counts[item.kind] += 1;
  return [
    counts.voice ? `${counts.voice} voice` : '',
    counts.photo ? `${counts.photo} photo` : '',
    counts.commit ? `${counts.commit} commit` : '',
    counts.note ? `${counts.note} note` : '',
    counts.measurement ? `${counts.measurement} measurement` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
