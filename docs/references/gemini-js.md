# Gemini Developer API — Node.js integration

Checked **2026-10-11** against the installed `@google/genai@2.28.0` type declarations and the official JavaScript SDK documentation. This is the interface used by the current Node/TypeScript implementation; the older Python SDK notes in [`gemma4-gemini-api.md`](gemma4-gemini-api.md) remain historical provider research.

## Call shape

```ts
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await client.models.generateContent({
  model: process.env.GEMMA_MODEL ?? 'gemma-4-26b-a4b-it',
  contents: [{
    role: 'user',
    parts: [
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    ],
  }],
  config: { temperature: 0.2, maxOutputTokens: 8192 },
});
const text = response.text;
```

The SDK's `GenerateContentParameters` and `Part.inlineData` declarations were checked locally. Devlog does not assume that Gemma's constrained JSON mode is supported: the model is asked for JSON, the response is extracted, then strictly parsed with zod. It retries once on malformed/schema-invalid output. Output-specific source-tag and provenance checks run after schema parsing.

Images are sent as bounded inline base64 parts. Current defaults: at most 8 images per call, at most 5 MiB each, 20 MiB total, and JPEG/PNG/WebP only. Unsupported/oversized images are omitted rather than silently relabelled.

## Verification boundary

No live Gemini request was made in the repository build environment. Model availability, billing, quotas, request limits, account region and output quality still require a separately configured smoke test. Fixture-backed tests do not contact Gemini.

## Canonical references

- [Generate content with the Gemini API](https://ai.google.dev/gemini-api/docs/generate-content)
- [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Google Gen AI JavaScript SDK](https://github.com/googleapis/js-genai)
- [@google/genai on npm](https://www.npmjs.com/package/@google/genai)
