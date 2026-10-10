/**
 * Error type and Express error middleware. Express 5 forwards rejected
 * promises from async handlers here automatically.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, 'bad_request', message, details);
  }

  static notFound(message: string): HttpError {
    return new HttpError(404, 'not_found', message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, 'conflict', message);
  }

  static unprocessable(message: string, details?: unknown): HttpError {
    return new HttpError(422, 'unprocessable', message, details);
  }

  static notImplemented(message: string): HttpError {
    return new HttpError(501, 'not_implemented', message);
  }

  static provider(message: string, details?: unknown): HttpError {
    return new HttpError(502, 'provider_error', message, details);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'schema_violation',
        message: 'Request or stored data failed validation.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  // Never leak a provider response body or a key to the client.
  console.error('[devlog] unhandled error:', err instanceof Error ? err.stack : err);
  res.status(500).json({ error: { code: 'internal', message } });
}
