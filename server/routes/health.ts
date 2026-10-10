import { Router } from 'express';
import { config } from '../config';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    version: config.version,
    mock: config.mock,
    providers: {
      gemini: Boolean(config.gemini.apiKey),
      elevenlabs: Boolean(config.elevenlabs.apiKey),
    },
    dataDir: config.dataDir,
  });
});
