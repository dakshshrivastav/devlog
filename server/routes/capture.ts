/**
 * Capture upload.
 *
 * Stores audio, photos, and videos into the session's immutable `capture/`
 * directory under stable media ids that later pipeline stages can reference.
 */
import path from 'node:path';
import { readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { ensureSessionDirs, getSession } from '../store/sessionStore';
import { HttpError } from '../lib/errors';

const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.aac', '.opus']);
const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);

const counters = new WeakMap<Request, Record<string, number>>();

function fieldPrefix(fieldname: string): string {
  if (fieldname === 'audio') return 'audio';
  if (fieldname === 'videos') return 'video';
  return 'photo';
}

function safeExt(originalName: string, mimetype: string, fieldname: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = fieldname === 'audio' ? AUDIO_EXT : fieldname === 'videos' ? VIDEO_EXT : PHOTO_EXT;
  if (allowed.has(ext)) return ext;
  if (fieldname === 'audio') {
    if (mimetype.includes('webm')) return '.webm';
    if (mimetype.includes('wav')) return '.wav';
    if (mimetype.includes('mpeg') || mimetype.includes('mp3')) return '.mp3';
    if (mimetype.includes('mp4') || mimetype.includes('m4a')) return '.m4a';
    if (mimetype.includes('ogg')) return '.ogg';
    return '.webm';
  }
  if (fieldname === 'videos') {
    if (mimetype.includes('webm')) return '.webm';
    if (mimetype.includes('quicktime')) return '.mov';
    if (mimetype.includes('matroska')) return '.mkv';
    if (mimetype.includes('x-msvideo')) return '.avi';
    return '.mp4';
  }
  if (mimetype.includes('png')) return '.png';
  if (mimetype.includes('webp')) return '.webp';
  return '.jpg';
}

async function nextIndex(dir: string, prefix: string): Promise<number> {
  if (!existsSync(dir)) return 1;
  const entries = await readdir(dir);
  const used = entries
    .map((name) => {
      const match = name.match(new RegExp(`^${prefix}-(\\d+)\\.`));
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((n) => Number.isFinite(n));
  return used.length > 0 ? Math.max(...used) + 1 : 1;
}

const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb) => {
    try {
      const sessionId = (req.params as { id?: string }).id;
      if (!sessionId) throw HttpError.badRequest('Missing session id.');
      const paths = await ensureSessionDirs(sessionId);
      const destination = file.fieldname === 'audio'
        ? paths.audio
        : file.fieldname === 'videos'
          ? paths.videos
          : paths.photos;
      cb(null, destination);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: async (req: Request, file: Express.Multer.File, cb) => {
    try {
      const sessionId = (req.params as { id?: string }).id;
      if (!sessionId) throw HttpError.badRequest('Missing session id.');
      const paths = await ensureSessionDirs(sessionId);
      const prefix = fieldPrefix(file.fieldname);
      const dir = file.fieldname === 'audio'
        ? paths.audio
        : file.fieldname === 'videos'
          ? paths.videos
          : paths.photos;

      let perRequest = counters.get(req);
      if (!perRequest) {
        perRequest = {};
        counters.set(req, perRequest);
      }
      if (perRequest[prefix] === undefined) perRequest[prefix] = await nextIndex(dir, prefix);

      const name = `${prefix}-${perRequest[prefix]}${safeExt(file.originalname, file.mimetype, file.fieldname)}`;
      perRequest[prefix] += 1;
      cb(null, name);
    } catch (err) {
      cb(err as Error, '');
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 256 * 1024 * 1024, files: 64, fields: 8 },
});

export const captureRouter = Router({ mergeParams: true });

captureRouter.post(
  '/',
  upload.fields([
    { name: 'audio', maxCount: 24 },
    { name: 'photos', maxCount: 40 },
    { name: 'videos', maxCount: 4 },
  ]),
  async (req: Request, res: Response) => {
    const sessionId = (req.params as { id: string }).id;
    const session = await getSession(sessionId);
    if (!session) throw HttpError.notFound(`No session with id "${sessionId}".`);

    const paths = await ensureSessionDirs(sessionId);
    const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const audio = files.audio ?? [];
    const photos = files.photos ?? [];
    const videos = files.videos ?? [];

    for (const file of [...audio, ...photos, ...videos]) {
      const ext = path.extname(file.filename).toLowerCase();
      const allowed = audio.includes(file) ? AUDIO_EXT : videos.includes(file) ? VIDEO_EXT : PHOTO_EXT;
      if (!allowed.has(ext)) {
        throw HttpError.badRequest(`Unsupported capture type "${ext || file.originalname}".`);
      }
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes : '';
    const keyterms = typeof req.body?.keyterms === 'string' ? req.body.keyterms : '';
    if (notes.trim()) await writeFile(path.join(paths.capture, 'notes.txt'), notes, 'utf8');
    if (keyterms.trim()) {
      await writeFile(path.join(paths.capture, 'keyterms.txt'), keyterms, 'utf8');
    }

    res.status(201).json({
      sessionId,
      stored: {
        audio: audio.map((f) => ({ mediaId: path.parse(f.filename).name, filename: f.filename, bytes: f.size })),
        photos: photos.map((f) => ({ mediaId: path.parse(f.filename).name, filename: f.filename, bytes: f.size })),
        videos: videos.map((f) => ({ mediaId: path.parse(f.filename).name, filename: f.filename, bytes: f.size })),
        notes: notes.trim().length > 0,
        keyterms: keyterms.trim().length > 0,
      },
      nextStep: 'POST /api/sessions/:id/process to build the timeline and synthesize documentation.',
    });
  }
);
