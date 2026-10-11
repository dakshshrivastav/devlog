# Gemma 4 MaaS on Vertex AI with ADC

**Checked:** 2026-10-11. **Model:** `gemma-4-26b-a4b-it-maas`. **SDK:** `@google/genai@2.28.0`.

## Configuration

The Node server uses the Google Gen AI SDK's Vertex mode. Authentication is Application Default Credentials (ADC); no Gemini API key is sent to the browser or required for this mode.

```ts
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
});
```

When `GOOGLE_CLOUD_PROJECT` is unset, Devlog reads only `quota_project_id` or `project_id` from the standard ADC file. It does not log or persist credentials. `global` is the default because this Gemma MaaS model is not available in `us-central1`.

## Verification performed

- ADC credentials were loaded with `gcloud auth application-default print-access-token`.
- `@google/genai@2.28.0` successfully called `gemma-4-26b-a4b-it-maas` at `global` with a minimal prompt and returned `OK`.
- The AI Studio model id `gemma-4-26b-a4b-it` returned 404 through Vertex, as expected; use the `-maas` model id for this path.
- `gemma-4-26b-a4b-it-maas` at `us-central1` returned the provider error that it is only available via the global endpoint.

The smoke tests also exercised Devlog's `generateJson` schema path and image-part path, and Gemma generated a sourced hardware graph that passed Mermaid parsing. A synthetic audio-to-docs run completed; its short speech sample yielded no hardware nodes, while a separate clear-text extraction did. Account quotas, billing, user-recording quality, and browser microphone UX remain unverified.

## References

- [Call MaaS APIs for open models](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/call-open-model-apis)
- [Gemma 4 MaaS model page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/google/gemma-4-26b-a4b-it)
- [Google Gen AI JavaScript SDK](https://github.com/googleapis/js-genai)
- [Application Default Credentials](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/gcp-auth)
