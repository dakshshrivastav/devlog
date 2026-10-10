/**
 * Documentation bundle. Streams the session's artifact directory as a real zip
 * instead of the prototype's single hardcoded markdown blob.
 */
import { createReadStream, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import { pathsFor } from '../store/sessionStore';

async function walk(dir: string, base: string, out: { rel: string; absolute: string }[]) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walk(absolute, rel, out);
    else if (entry.name !== 'index.json') out.push({ rel, absolute });
  }
}

export interface BundleManifestEntry {
  path: string;
  bytes: number;
}

export async function streamBundleZip(
  sessionId: string,
  sessionSlug: string,
  res: Response
): Promise<BundleManifestEntry[]> {
  const artifactsDir = pathsFor(sessionId).artifacts;
  const files: { rel: string; absolute: string }[] = [];
  await walk(artifactsDir, '', files);
  files.sort((a, b) => a.rel.localeCompare(b.rel));

  const manifest: BundleManifestEntry[] = [];
  for (const f of files) {
    const info = await stat(f.absolute);
    manifest.push({ path: f.rel, bytes: info.size });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="devlog-${sessionSlug}-documentation.zip"`
  );

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on('warning', (err) => console.warn('[zip] warning:', err.message));
  archive.on('error', (err) => {
    console.error('[zip] error:', err.message);
    if (!res.headersSent) res.status(500).end();
    else res.destroy(err);
  });

  archive.pipe(res);

  for (const f of files) {
    archive.append(createReadStream(f.absolute), { name: f.rel });
  }

  archive.append(
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        session: sessionId,
        files: manifest,
      },
      null,
      2
    )}\n`,
    { name: 'devlog-manifest.json' }
  );

  await archive.finalize();
  return manifest;
}
