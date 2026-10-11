/**
 * Gemini Developer API / Vertex AI provider.
 *
 * Supports AI Studio API keys and Vertex AI ADC. ADC defaults to the global
 * Cloud MaaS Gemma 4 model; `GEMMA_MODEL` can override the mode-specific id.
 *
 * Structured output is not assumed for this model. `generateJson` requests JSON
 * in the prompt, extracts it defensively, and validates with the caller's zod
 * schema; a validation failure retries once with the error fed back, then
 * throws so the pipeline can omit-and-gap instead of writing bad data.
 *
 * No key or provider response body is ever logged.
 */
import { GoogleGenAI } from '@google/genai';
import type { ZodType } from 'zod';
import { config } from '../config';
import { HttpError } from '../lib/errors';

export interface ImageInput {
  data: Uint8Array;
  mimeType: string;
  name?: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = config.gemini.apiKey;
  if (apiKey) {
    if (!client) client = new GoogleGenAI({ apiKey });
    return client;
  }
  if (config.gemini.vertexai && config.gemini.project) {
    if (!client) {
      client = new GoogleGenAI({
        vertexai: true,
        project: config.gemini.project,
        location: config.gemini.location,
      });
    }
    return client;
  }
  throw HttpError.unprocessable(
    'Gemma is not configured. Set GEMINI_API_KEY or configure Google Cloud ADC; set GOOGLE_CLOUD_PROJECT if the project cannot be inferred.'
  );
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Apply the documented inline-image envelope before sending anything. */
export function prepareImages(images: readonly ImageInput[]): ImageInput[] {
  const accepted = images.filter((image) => SUPPORTED_IMAGE_TYPES.has(image.mimeType));
  const withinPerImage = accepted.filter((image) => image.data.byteLength <= config.limits.maxPhotoBytes);
  const out: ImageInput[] = [];
  let total = 0;
  for (const image of withinPerImage) {
    if (out.length >= config.limits.maxPhotosPerCall) break;
    if (total + image.data.byteLength > config.limits.maxInlinePayloadBytes) break;
    out.push(image);
    total += image.data.byteLength;
  }
  return out;
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function isTransientProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = error && typeof error === 'object' && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  return status === 429 || status >= 500 || /RESOURCE_EXHAUSTED|UNAVAILABLE|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(message);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(prompt: string, images: readonly ImageInput[], options: GenerateOptions): Promise<string> {
  const ai = getClient();
  const prepared = prepareImages(images);

  const parts: { text?: string; inlineData?: { data: string; mimeType: string; displayName?: string } }[] = [
    { text: prompt },
  ];
  for (const image of prepared) {
    parts.push({
      inlineData: {
        data: base64(image.data),
        mimeType: image.mimeType,
        displayName: image.name,
      },
    });
  }

  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: [{ role: 'user', parts }],
        config: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
          ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
        },
      });
      break;
    } catch (err) {
      lastError = err;
      if (attempt === 2 || !isTransientProviderError(err)) break;
      await delay(500 * 2 ** attempt);
    }
  }
  if (!response) {
    const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error');
    throw HttpError.provider(`Gemini request failed for model ${config.gemini.model}: ${message}`);
  }

  const text = response.text ?? '';
  if (!text.trim()) {
    const blocked = response.candidates?.[0]?.finishReason;
    throw HttpError.provider(
      `Gemini returned an empty response${blocked ? ` (finish reason: ${blocked})` : ''}.`
    );
  }
  return text;
}

export async function generateText(
  prompt: string,
  images: readonly ImageInput[] = [],
  options: GenerateOptions = {}
): Promise<string> {
  return call(prompt, images, options);
}

/** Pull JSON out of a response that may be fenced, prefixed or suffixed. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const firstObj = candidate.indexOf('{');
  const firstArr = candidate.indexOf('[');
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return candidate.trim();

  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  const end = candidate.lastIndexOf(close);
  if (end <= start) return candidate.slice(start).trim();
  return candidate.slice(start, end + 1).trim();
}

export interface GenerateJsonResult<T> {
  data: T;
  attempts: number;
}

export async function generateJson<T>(
  prompt: string,
  schema: ZodType<T>,
  images: readonly ImageInput[] = [],
  options: GenerateOptions = {}
): Promise<GenerateJsonResult<T>> {
  let lastError = '';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const text = await call(
      attempt === 1
        ? prompt
        : `${prompt}\n\nYour previous reply did not validate. Fix exactly these problems and reply with JSON only:\n${lastError}`,
      images,
      options
    );

    const raw = extractJson(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      lastError = `Reply was not valid JSON: ${(err as Error).message}`;
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return { data: result.data, attempts: attempt };
    lastError = result.error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
  }

  throw HttpError.unprocessable(
    `Gemini did not return data matching the required schema after 2 attempts. Last problems:\n${lastError}`
  );
}
