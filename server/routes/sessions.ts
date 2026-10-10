import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Router, type Request, type Response } from 'express';
import {
  CreateSessionRequestSchema,
  PatchSessionRequestSchema,
  ProcessRequestSchema,
} from '../../shared/schema/index';
import type { SessionBundle } from '../../shared/schema/index';
import { HttpError } from '../lib/errors';
import { emit, finishRun, loadRecentEvents, loadRun, subscribe } from '../lib/runs';
import { runPipeline } from '../pipeline';
import { streamBundleZip } from '../lib/zip';
import {
  contentTypeFor,
  deleteSession,
  getSession,
  listSessions,
  loadBundle,
  patchSession,
  createSession,
  resolveArtifactPath,
  resolveMedia,
} from '../store/sessionStore';

export const sessionsRouter = Router();

async function bundleOrFail(sessionId: string): Promise<SessionBundle> {
  try {
    return await loadBundle(sessionId);
  } catch {
    throw HttpError.notFound(`No session with id "${sessionId}".`);
  }
}

/* -------------------------------------------------------------------------- */
/* Collection                                                                  */
/* -------------------------------------------------------------------------- */

sessionsRouter.get('/', async (_req, res) => {
  res.json(await listSessions());
});

sessionsRouter.post('/', async (req: Request, res: Response) => {
  const input = CreateSessionRequestSchema.parse(req.body ?? {});
  const session = await createSession(input);
  res.status(201).json(session);
});

/* -------------------------------------------------------------------------- */
/* Item                                                                        */
/* -------------------------------------------------------------------------- */

sessionsRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  res.json(await bundleOrFail(req.params.id));
});

sessionsRouter.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const patch = PatchSessionRequestSchema.parse(req.body ?? {});
  const existing = await getSession(req.params.id);
  if (!existing) throw HttpError.notFound(`No session with id "${req.params.id}".`);
  res.json(await patchSession(req.params.id, patch));
});

sessionsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const existing = await getSession(req.params.id);
  if (!existing) throw HttpError.notFound(`No session with id "${req.params.id}".`);
  await deleteSession(req.params.id);
  res.status(204).end();
});

/* -------------------------------------------------------------------------- */
/* Processing                                                                  */
/* -------------------------------------------------------------------------- */

sessionsRouter.post('/:id/process', async (req: Request<{ id: string }>, res: Response) => {
  const options = ProcessRequestSchema.parse(req.body ?? {});
  const bundle = await bundleOrFail(req.params.id);

  const existing = await loadRun(req.params.id);
  if (existing && existing.status === 'running') {
    throw HttpError.conflict('A run is already in progress for this session.');
  }

  try {
    const runId = await runPipeline(req.params.id, options);
    res.status(202).json({ runId, sessionId: bundle.session.id, mock: bundle.session.mock });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    await finishRun(req.params.id, 'failed', err instanceof Error ? err.message : 'Run failed.');
    throw err;
  }
});

/** Server-sent events: run snapshot on connect, then each event as it happens. */
sessionsRouter.get('/:id/events', async (req: Request<{ id: string }>, res: Response) => {
  await bundleOrFail(req.params.id);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  const run = await loadRun(req.params.id);
  const events = await loadRecentEvents(req.params.id);
  res.write(`event: snapshot\ndata: ${JSON.stringify({ run, events })}\n\n`);

  const unsubscribe = subscribe(req.params.id, (event) => {
    res.write(`event: run\ndata: ${JSON.stringify(event)}\n\n`);
  });

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(ping);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

/* -------------------------------------------------------------------------- */
/* Files                                                                       */
/* -------------------------------------------------------------------------- */

sessionsRouter.get('/:id/media/:mediaId', async (req: Request<{ id: string; mediaId: string }>, res: Response) => {
  await bundleOrFail(req.params.id);
  const media = await resolveMedia(req.params.id, req.params.mediaId);
  if (!media) throw HttpError.notFound(`No stored media "${req.params.mediaId}".`);
  res.setHeader('Content-Type', media.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(media.absolute);
});

sessionsRouter.get('/:id/artifact', async (req: Request<{ id: string }>, res: Response) => {
  const name = typeof req.query.path === 'string' ? req.query.path : '';
  if (!name) throw HttpError.badRequest('Missing ?path= for the artifact to read.');
  await bundleOrFail(req.params.id);

  const { absolute } = resolveArtifactPath(req.params.id, name);
  if (!existsSync(absolute)) throw HttpError.notFound(`No artifact "${name}" in this session.`);

  const body = await readFile(absolute, 'utf8');
  res.setHeader('Content-Type', contentTypeFor(name));
  res.send(body);
});

sessionsRouter.get('/:id/bundle', async (req: Request<{ id: string }>, res: Response) => {
  const bundle = await bundleOrFail(req.params.id);
  const openGaps = bundle.gaps.filter((g) => g.status === 'open').length;
  await emit(req.params.id, 'log', {
    message: `Bundle requested (${bundle.artifacts.length} artifacts, ${openGaps} open gaps).`,
  });
  await streamBundleZip(req.params.id, bundle.session.slug, res);
});
