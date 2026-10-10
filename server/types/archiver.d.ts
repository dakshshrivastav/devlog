/**
 * archiver v8 ships as ESM with class exports and no bundled types; the
 * `@types/archiver` package still describes the v6/v7 factory API. This is the
 * minimal declaration for the surface devlog uses.
 */
declare module 'archiver' {
  import type { Readable } from 'node:stream';

  export interface ZipArchiveOptions {
    zlib?: { level?: number };
  }

  export class ZipArchive extends Readable {
    constructor(options?: ZipArchiveOptions);
    append(source: unknown, data: { name: string }): this;
    finalize(): Promise<void>;
    on(event: 'warning' | 'error', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export class Archiver extends ZipArchive {}
  export class TarArchive extends ZipArchive {}
  export class JsonArchive extends ZipArchive {}
}
