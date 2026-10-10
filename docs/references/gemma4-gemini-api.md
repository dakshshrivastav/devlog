# Gemma 4 — Gemini Developer API

**Checked:** 2026-10-10. **Selected model:** `gemma-4-26b-a4b-it`. **SDK:** `google-genai` (`google.genai`); installed version **2.29.0** was checked locally. The dependency constraint is `>=2.29,<3` because the SDK README warns to pin below 3.0 pending a major-version change.

## Call shape used

The official Python SDK README demonstrates `genai.Client(api_key=...)`, `client.models.generate_content(model=..., contents=...)`, and `response.text`. Its image input examples use `types.Part.from_bytes(data=..., mime_type=...)`. Devlog calls the selected Gemma model with the timeline prompt and bounded inline image parts. The client API, `generate_content`, and `Part.from_bytes` were verified in the official SDK repository; a live call has not been made.

Devlog requests plain text/Markdown rather than relying on constrained JSON output. Source tags, note format, and the restricted Mermaid subset are checked locally, with one correction attempt. Generic Gemini structured-output documentation does not by itself establish that the selected Gemma model will honor this application's full contract.

## Limits in this implementation

- `GEMINI_API_KEY` is required. The Google AI Studio key is read from the server process environment.
- Model ID is configurable via `GEMMA_MODEL`; default is the selected Gemma 4 26B A4B instruction-tuned model.
- At most 8 photos are sent per generated artifact, each at most 5 MiB and with a total inline payload at most 20 MiB. Supported types: JPEG, PNG, WebP.
- Generated output response text must be non-empty. Provider errors and empty/blocked text are surfaced; no provider response or key is logged by Devlog.
- Model/account availability, request/token limits, rates, pricing, account region, and actual photo response behavior were not live-tested.

## Canonical references

- [Run Gemma with the Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) — hosted model IDs and quickstart.
- [Gemini API generate content](https://ai.google.dev/gemini-api/docs/generate-content) — content parts and generation call.
- [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) — inline image input.
- [Structured output](https://ai.google.dev/gemini-api/docs/structured-output) — generic API schema mode; not assumed for Gemma here.
- [Official Google Gen AI Python SDK](https://github.com/googleapis/python-genai) — imports, client lifecycle, method and image part examples.
- [google-genai on PyPI](https://pypi.org/project/google-genai/)
