/** Local video preprocessing: bounded audio extraction and sparse frame sampling. */
import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { HttpError } from '../lib/errors';
import type { SessionPaths } from '../store/sessionStore';

const execFile = promisify(execFileCallback);

export const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);

export interface VideoFrameAsset {
  videoId: string;
  videoIndex: number;
  frameIndex: number;
  videoName: string;
  mediaId: string;
  name: string;
  path: string;
  timeSec: number;
  durationSec: number | null;
  videoMtime: string;
}

export interface VideoAssets {
  audioPaths: { audioId: string; path: string }[];
  frames: VideoFrameAsset[];
  videosWithoutAudio: string[];
}

interface ProbeResponse {
  format?: { duration?: string };
  streams?: { codec_type?: string }[];
}

export async function extractVideoAssets(
  paths: SessionPaths,
  videoFiles: { name: string; absolute: string }[],
  maxFrames: number
): Promise<VideoAssets> {
  await rm(paths.videoAudio, { recursive: true, force: true });
  await rm(paths.videoFrames, { recursive: true, force: true });
  await mkdir(paths.videoAudio, { recursive: true });
  await mkdir(paths.videoFrames, { recursive: true });

  const result: VideoAssets = { audioPaths: [], frames: [], videosWithoutAudio: [] };
  if (!videoFiles.length) return result;

  const frameCounts = allocateFrames(videoFiles.length, maxFrames);
  for (const [index, video] of videoFiles.entries()) {
    const videoId = path.parse(video.name).name;
    const probe = await probeVideo(video.absolute);
    if (!probe.streams?.some((stream) => stream.codec_type === 'video')) {
      throw HttpError.badRequest(`Video file "${video.name}" has no video stream.`);
    }
    const duration = Number.parseFloat(probe.format?.duration ?? '');
    const durationSec = Number.isFinite(duration) && duration > 0 ? duration : null;
    const videoMtime = (await stat(video.absolute)).mtime.toISOString();

    if (probe.streams?.some((stream) => stream.codec_type === 'audio')) {
      const audioPath = path.join(paths.videoAudio, `${videoId}.wav`);
      await runFfmpeg([
        '-y', '-v', 'error', '-i', video.absolute, '-map', '0:a:0', '-vn',
        '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audioPath,
      ], video.name);
      result.audioPaths.push({ audioId: videoId, path: audioPath });
    } else {
      result.videosWithoutAudio.push(video.name);
    }

    const frameBudget = frameCounts[index] ?? 0;
    const frameCount = durationSec === null ? Math.min(frameBudget, 1) : frameBudget;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const timeSec = durationSec === null ? 0 : durationSec * (frameIndex + 1) / (frameCount + 1);
      const frameNumber = frameIndex + 1;
      const name = `${videoId}-frame-${String(frameNumber).padStart(2, '0')}.jpg`;
      const framePath = path.join(paths.videoFrames, name);
      await runFfmpeg([
        '-y', '-v', 'error', '-ss', timeSec.toFixed(3), '-i', video.absolute,
        '-map', '0:v:0', '-frames:v', '1', '-vf', "scale='min(1600,iw)':-2", '-q:v', '5', framePath,
      ], video.name);
      result.frames.push({
        videoId,
        videoIndex: index + 1,
        frameIndex: frameNumber,
        videoName: video.name,
        mediaId: path.parse(name).name,
        name,
        path: framePath,
        timeSec,
        durationSec,
        videoMtime,
      });
    }
  }

  return result;
}

export function allocateFrames(videoCount: number, maxFrames: number): number[] {
  if (videoCount === 0 || maxFrames <= 0) return [];
  const total = Math.floor(maxFrames);
  const each = Math.floor(total / videoCount);
  const remainder = total % videoCount;
  return Array.from({ length: videoCount }, (_unused, index) => each + (index < remainder ? 1 : 0));
}

async function probeVideo(videoPath: string): Promise<ProbeResponse> {
  try {
    const { stdout } = await execFile('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', videoPath,
    ], { maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout) as ProbeResponse;
  } catch (cause) {
    throw videoError(cause, videoPath);
  }
}

async function runFfmpeg(args: string[], videoName: string): Promise<void> {
  try {
    await execFile('ffmpeg', args, { maxBuffer: 2 * 1024 * 1024 });
  } catch (cause) {
    throw videoError(cause, videoName);
  }
}

function videoError(cause: unknown, videoName: string): Error {
  const error = cause as NodeJS.ErrnoException & { stderr?: string };
  if (error.code === 'ENOENT') {
    return HttpError.unprocessable('Video uploads require ffmpeg and ffprobe on PATH. Install FFmpeg, then restart Devlog.');
  }
  const detail = error.stderr?.trim().split('\n').at(-1) || error.message || 'unknown FFmpeg error';
  return HttpError.unprocessable(`Could not process video "${path.basename(videoName)}": ${detail}`);
}

export async function listVideoFiles(dir: string): Promise<{ name: string; absolute: string }[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw cause;
  }
  return entries
    .filter((name) => VIDEO_EXT.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({ name, absolute: path.join(dir, name) }));
}
