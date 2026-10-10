/**
 * Server configuration.
 *
 * Every provider key stays here. The browser never receives a long-lived key —
 * only short-lived single-use tokens minted by `/live/token`.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..');

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function abs(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(repoRoot, p);
}

function intFrom(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface ProviderConfig {
  gemini: {
    apiKey: string | null;
    model: string;
  };
  elevenlabs: {
    apiKey: string | null;
    batchModel: string;
    realtimeModel: string;
    realtimeUrl: string;
    tokenUrl: string;
  };
}

export interface Config extends ProviderConfig {
  version: string;
  port: number;
  dataDir: string;
  sessionsDir: string;
  outputDir: string;
  fixturesDir: string;
  /**
   * True when the server serves fixtures and skips every provider call.
   * Auto-enabled when neither provider key is present, so `npm run dev` works
   * on a fresh clone with no secrets.
   */
  mock: boolean;
  mockForced: boolean;
  limits: {
    maxPhotosPerCall: number;
    maxPhotoBytes: number;
    maxInlinePayloadBytes: number;
  };
}

function build(): Config {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || null;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY?.trim() || null;
  const mockForced = process.env.MOCK === '1' || process.env.MOCK === 'true';
  const dataDir = abs(process.env.DATA_DIR || './data');

  return {
    version: readVersion(),
    port: intFrom('PORT', 8787),
    dataDir,
    sessionsDir: path.join(dataDir, 'sessions'),
    outputDir: abs(process.env.OUTPUT_DIR || '') || path.join(dataDir, 'out'),
    fixturesDir: abs('./fixtures'),
    gemini: {
      apiKey: geminiKey,
      model: process.env.GEMMA_MODEL?.trim() || 'gemma-4-26b-a4b-it',
    },
    elevenlabs: {
      apiKey: elevenLabsKey,
      batchModel: process.env.SCRIBE_MODEL?.trim() || 'scribe_v2',
      realtimeModel: process.env.SCRIBE_REALTIME_MODEL?.trim() || 'scribe_v2_realtime',
      realtimeUrl: 'wss://api.elevenlabs.io/v1/speech-to-text/realtime',
      tokenUrl: 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
    },
    mock: mockForced || (!geminiKey && !elevenLabsKey),
    mockForced,
    limits: {
      maxPhotosPerCall: intFrom('MAX_PHOTOS_PER_CALL', 8),
      maxPhotoBytes: intFrom('MAX_PHOTO_BYTES', 5 * 1024 * 1024),
      maxInlinePayloadBytes: intFrom('MAX_INLINE_PAYLOAD_BYTES', 20 * 1024 * 1024),
    },
  };
}

export const config = build();

/** True when both keys needed for a real batch run are present. */
export function canRunBatch(): boolean {
  return Boolean(config.gemini.apiKey && config.elevenlabs.apiKey);
}
