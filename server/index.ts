/**
 * Devlog server.
 *
 * Express 5, ESM, TypeScript run directly through tsx. Serves the API under
 * /api and, when a production build exists, the client from dist/.
 */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { config, repoRoot } from './config';
import { HttpError, errorHandler } from './lib/errors';
import { healthRouter } from './routes/health';
import { sessionsRouter } from './routes/sessions';
import { captureRouter } from './routes/capture';
import { gapsRouter } from './routes/gaps';
import { searchRouter } from './routes/search';
import { liveRouter } from './routes/live';

async function main(): Promise<void> {
  await mkdir(config.sessionsDir, { recursive: true });
  await mkdir(config.outputDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true, limit: '8mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/sessions/:id/capture', captureRouter);
  app.use('/api/sessions/:id/gaps', gapsRouter);
  app.use('/api/sessions/:id/live', liveRouter);
  app.use('/api/search', searchRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Unknown API route.' } });
  });

  const dist = path.join(repoRoot, 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    // SPA fallback for any non-API GET.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      const index = path.join(dist, 'index.html');
      if (!existsSync(index)) return next();
      res.sendFile(index);
    });
  }

  app.use((_req, _res, next) => {
    next(HttpError.notFound('Nothing is served at this path.'));
  });
  app.use(errorHandler);

  app.listen(config.port, () => {
    const mode = config.mock
      ? config.mockForced
        ? 'MOCK (forced)'
        : 'MOCK (no provider keys found)'
      : 'LIVE providers';
    console.log(`[devlog] ${config.version} · http://localhost:${config.port} · ${mode}`);
    console.log(`[devlog] sessions: ${config.sessionsDir}`);
    console.log(`[devlog] fixtures: ${config.fixturesDir}`);
    if (!config.mock) {
      console.log(
        `[devlog] gemini: ${config.gemini.model} · elevenlabs: ${config.elevenlabs.batchModel}`
      );
    }
  });
}

main().catch((err) => {
  console.error('[devlog] failed to start:', err);
  process.exit(1);
});
