# Devlog API Lookup Pack for OpenCode

**Purpose:** Give the coding agent the authoritative API references it must inspect before implementing Devlog. This is an API research guide, not a replacement for `idea.md` or `prompt.md`.

**Reference checked:** 2026-10-10. API behavior, model availability, SDK signatures, quotas, and pricing can change. The agent must re-open the official references before coding and note what it verified.

## 1. Instructions to the agent

Read `idea.md`, `prompt.md`, and this file first. Then research the official docs and SDK source for each API used in the current build step.

Rules:

1. Prefer official API documentation, official SDK repositories, and official model cards. Do not rely on blog posts, Stack Overflow, or guessed examples when primary sources exist.
2. Verify the exact model ID, package name, import path, method signature, request fields, response schema, timestamp semantics, connection lifecycle, limits, errors, and retries before writing the call.
3. Record findings under `docs/references/` using the suggested file structure below. Include the canonical URL, date checked, exact snippets or field tables needed for implementation, and unresolved questions. Keep excerpts short; prefer summaries and links over copying entire pages.
4. Build tiny API probes first. Run them against a short audio sample / tiny image sample and save redacted output examples or fixtures. Never put API keys in fixtures, logs, source files, or checked-in environment files.
5. If a required detail cannot be verified, stop at that build step and ask for the exact missing information. Do not guess.
6. Re-check SDK code in the installed version, not just a current online README. Pin compatible dependency versions in `pyproject.toml` after testing.
7. Keep the API adapter independent of the rest of the pipeline. Normalize each provider's response into Devlog's internal data model while preserving raw responses unchanged.

## 2. Critical API findings already verified

### Google / Gemma 4

- The official Gemma-on-Gemini-API page currently lists hosted model IDs `gemma-4-31b-it` and `gemma-4-26b-a4b-it`.
- The official page uses the Python SDK package `google-genai`, imported as `from google import genai`, and shows `client.models.generate_content(model=..., contents=...)`.
- Gemma 4 supports image input. The model card distinguishes which sizes support native audio: E2B, E4B, and 12B. Do not assume every Gemma 4 variant supports the same modalities.
- The idea specification mentions both Gemini API use and local/offline Gemma 4. Those are different deployment paths. Do not silently claim that the Gemini API path is offline, or assume a hosted model ID works as a local model ID.
- General Gemini structured-output documentation exists, but the agent must verify that the selected Gemma 4 model and exact API path support the required JSON schema mode. If unsupported or unreliable, request JSON in the prompt and validate locally; do not trust model output without validation.

Primary references:

1. Gemma 4 through Gemini API: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
2. Gemma 4 model card / modalities / variants: https://ai.google.dev/gemma/docs/core/model_card_4
3. Gemini API generate content and Python SDK usage: https://ai.google.dev/gemini-api/docs/generate-content
4. Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
5. Gemini input methods for images and other files: https://ai.google.dev/gemini-api/docs/generate-content/file-input-methods
6. Gemini Files API: https://ai.google.dev/gemini-api/docs/generate-content/files
7. Official Python SDK source: https://github.com/googleapis/python-genai
8. Official Google GenAI SDK package information: https://pypi.org/project/google-genai/

The agent must verify before implementation:

- Which hosted Gemma 4 ID will be used, and whether it is available to the user's API key / region / current API path.
- Current input and output token limits, image count and image-size constraints, request-size limits, rate limits, quota behavior, pricing, and relevant model deprecations.
- How to pass multiple local photos in one prompt using the selected Python SDK version.
- Whether an inline image part or Files API upload is the right choice for normal capture folders; check retention / expiry for uploaded files.
- Whether the chosen Gemma 4 hosted model actually supports constrained JSON output with the required response schema.
- Timeouts, retryable errors, rate-limit responses, and whether calls are synchronous or streamed. The first version only needs non-streaming generation unless the implementation plan explicitly requires otherwise.
- How the raw provider response and finish/blocked/error states are exposed by the SDK.

### ElevenLabs Scribe v2 — recorded audio

- Current documented endpoint: `POST https://api.elevenlabs.io/v1/speech-to-text`.
- Model ID in the official quickstart: `scribe_v2`.
- The request is multipart form data and accepts an audio file. The API supports word-level timestamps through `timestamps_granularity="word"` (currently documented as the default, but set it explicitly so intent is clear).
- The current API schema has a `keyterms` parameter: up to 1000 terms, fewer than 50 characters per term, up to 5 words per term. The documentation says use incurs an additional charge. Check current pricing before enabling it for every request.
- Response examples include the complete transcript plus a `words` array with `start`, `end`, `text`, and potentially fields such as `type` and speaker metadata. Preserve the full raw JSON response; normalize it separately.

Primary references:

1. Exact REST endpoint, parameters, response, errors: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
2. Official batch STT Python quickstart: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text
3. Official Python SDK source: https://github.com/elevenlabs/elevenlabs-python
4. Official Python SDK package: https://pypi.org/project/elevenlabs/
5. ElevenLabs docs index for agent-oriented lookup: https://elevenlabs.io/docs/llms.txt

The agent must verify before implementation:

- The exact current Python call signature for `speech_to_text.convert` in the pinned `elevenlabs` version.
- Supported extensions / MIME formats and file-size limits for each chosen input route; the capture spec includes `.m4a`, `.wav`, and `.mp3`.
- The exact object shape returned by the installed SDK and whether timestamps are relative to the start of each file.
- Whether `keyterms` is supported by the selected model and SDK version, validation behavior, maximums, and current price impact.
- Error classes and safe retry behavior. Do not retry permanent auth/configuration failures as though they were transient failures.
- Whether raw responses can be serialized faithfully to JSON with the SDK's model types; define a safe serializer and test it.

### ElevenLabs Scribe v2 Realtime — live microphone transcription

- Current documented WebSocket endpoint: `wss://api.elevenlabs.io/v1/speech-to-text/realtime`.
- Realtime model ID: `scribe_v2_realtime`.
- Server-side authentication uses `xi-api-key`; client-side use should use a single-use token rather than expose the API key.
- The API accepts PCM formats including `pcm_16000`; request configuration includes an audio format and sample rate. Verify what exact bytes the microphone capture library produces and resample/convert explicitly if necessary.
- Documented event types include session start, partial transcript, committed transcript, and committed transcript with timestamps when timestamps are enabled. Partial transcripts can change; committed transcripts are stable. Do not append partials as though each were a final independent utterance.
- The realtime API has its own smaller keyterm limit than batch transcription: the current reference says max 50 keyterms. Do not reuse batch parameters without checking the realtime schema.
- The server-side Python guide demonstrates `elevenlabs.speech_to_text.realtime.connect(...)` and event handlers. The client-side guide's microphone example is JavaScript/React; do not copy that into the Python CLI and assume it works.

Primary references:

1. Exact WebSocket endpoint, handshake query parameters, sent/received message schemas and errors: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
2. Official Python server-side streaming guide: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/server-side-streaming
3. Client-side streaming guide (useful for token flow and to understand the browser-only example): https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming
4. Official Python SDK source: https://github.com/elevenlabs/elevenlabs-python
5. Official docs agent index: https://elevenlabs.io/docs/llms.txt

The agent must verify before implementation:

- Exact Python SDK signatures and event names in the pinned package version.
- Which audio-capture library to use on the target OS, sample format / channel count / sample rate, chunk size constraints, and required audio conversions.
- Whether Devlog should store partial events, committed events, or both in the immutable raw log. Recommended default: append every received transcript event unchanged with event type and receive time; treat committed events as the canonical text chunks used by the downstream summarizer. If retaining partial events, de-duplicate or correlate them rather than generating duplicate notes.
- How to attach start/end timestamps to each committed chunk, including the case where word timestamps arrive in a separate delayed event. Do not invent chunk spans from wall-clock time if the API provides more accurate timing.
- Keepalive, commit strategy (manual vs VAD), end-of-session / close semantics, reconnect strategy, cancellation, and all rate-limit / timeout / quota events.
- Backpressure and offline behavior: raw events must be durably appended before sending work to Gemma 4; AI failure must never lose transcript events.
- The current realtime keyterms, timestamp options, audio formats, limits, costs and terms.

### ElevenAgents — conversational voice agents

This is a separate product surface from Scribe. ElevenAgents is a complete conversational system: speech recognition, an LLM, speech synthesis, and turn-taking orchestration. Use it only if Devlog needs a real back-and-forth voice agent (for example, an agent that asks documentation-gap questions and guides the builder through answers). Do not substitute an Agents conversation transcript for the Scribe live-capture log unless the product requirements are deliberately changed: the live-build pipeline needs its own immutable raw transcription events and precise source spans.

Primary official references:

1. ElevenAgents overview and architecture: https://elevenlabs.io/docs/eleven-agents/overview
2. Official quickstart: https://elevenlabs.io/docs/eleven-agents/quickstart
3. Official Python SDK / local microphone conversation: https://elevenlabs.io/docs/eleven-agents/libraries/python
4. Agent create endpoint: https://elevenlabs.io/docs/api-reference/agents/create
5. Agent get endpoint: https://elevenlabs.io/docs/eleven-agents/api-reference/agents/get
6. Agent list endpoint: https://elevenlabs.io/docs/eleven-agents/api-reference/agents/list
7. Agent update endpoint: https://elevenlabs.io/docs/eleven-agents/api-reference/agents/update
8. ElevenAgents WebSocket guide: https://elevenlabs.io/docs/eleven-agents/libraries/web-sockets
9. Get signed conversation URL: https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-signed-url
10. Get WebRTC token: https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token
11. Retrieve conversation details/transcript: https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get
12. Retrieve conversation summary: https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-summary
13. Agent widget deployment: https://elevenlabs.io/docs/eleven-agents/customization/widget
14. Agent authentication: https://elevenlabs.io/docs/eleven-agents/customization/authentication
15. Agent tools index: https://elevenlabs.io/docs/eleven-agents/customization/tools
16. Webhook tools: https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools
17. Client tools: https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools
18. Knowledge base: https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base
19. Dynamic variables: https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables
20. Official Python SDK source: https://github.com/elevenlabs/elevenlabs-python
21. Official package: https://pypi.org/project/elevenlabs/
22. Official documentation index: https://elevenlabs.io/docs/llms.txt

Current API surfaces observed in the official docs (re-open and verify before implementing):

- Create agent: `POST https://api.elevenlabs.io/v1/convai/agents/create`. Its request requires `conversation_config`; optional fields include platform settings, workflow, name, and tags. All agents are versioned; the old `enable_versioning` query parameter is deprecated/ignored.
- Get an existing agent's configuration via the documented Get Agent endpoint. Use the exact response schema from the current docs/SDK instead of inventing a configuration object.
- Update an agent using the official Update Agent endpoint. Confirm whether changing agent configuration is necessary at runtime; prefer reusing an `ELEVENLABS_AGENT_ID` supplied from environment/config rather than auto-creating new agents in every run.
- Official Python SDK examples import `ElevenLabs` from `elevenlabs.client`, plus `Conversation` and `DefaultAudioInterface` from `elevenlabs.conversational_ai`. The documented flow creates `Conversation(...)`, registers callbacks (agent response, response correction, user transcript), calls `start_session()`, and eventually calls `end_session()` / `wait_for_session_end()`. Verify exact signatures against the version pinned in `pyproject.toml`.
- Low-level WebSocket endpoint: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}`. Public agents may connect using an agent ID; private/authenticated agents should obtain a signed URL server-side. The API key must never be put in browser JavaScript.
- Signed URL endpoint: `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=...`, authenticated on the server with `xi-api-key` for a protected agent. The response contains a `signed_url`. Verify token expiry/one-use semantics and any conversation options in current docs before depending on them.
- Conversation transcript endpoint: `GET https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}`. The documented result includes conversation status and a transcript array (speaker role, message, call-relative timing, plus possible tool-call metadata). Verify exactly when the result is final and how failed/interrupted sessions appear.
- Agents can expose client tools, webhook tools, code tools, MCP tools, and system tools. Client tools run in the client environment; webhook tools call server APIs. Do not assume a hosted ElevenLabs service can reach a user's `localhost`. A webhook that must reach Devlog needs an intentionally reachable backend, which conflicts with a strictly local-only architecture unless an explicit bridge is designed.
- Knowledge-base retrieval is optional; it is not a prerequisite to giving an agent the current `GAPS.md` questions. Dynamic variables/overrides may be useful for passing the current project name or current question, but verify the exact SDK and security model.

Agent integration questions/tests before code:

- Is a true ElevenAgents conversational flow actually wanted, or should `devlog gaps` simply read each missing-fact question aloud with TTS and transcribe the user's answer via Scribe? These are distinct architectures and cost profiles. The agent must not decide silently.
- If using an existing agent, where is `ELEVENLABS_AGENT_ID` configured? Never create a new hosted agent on each CLI invocation.
- Does the use case require browser-based voice interaction in the tiny local page, or a Python CLI/microphone session? Choose the official SDK/API surface for the actual runtime.
- How are user answers exported from the agent transcript and fed back into Devlog's source-tagged timeline? Persist the response before attempting downstream generation, and retain the transcript's own provenance separately from build-session audio.
- Test auth, signed-URL handling, connection interruptions, end-session behavior, transcript retrieval, timeouts and privacy/retention settings.
- Simulate a short conversation using the official simulation API/test workflow before relying on a real microphone session; mark any billed tests as explicit live tests.

### ElevenLabs Text-to-Speech (spoken gap questions)

TTS is the lightweight option when Devlog only needs to read `GAPS.md` questions aloud. It does not, by itself, handle a conversational agent or transcribe answers.

Primary references:

1. Synchronous Create Speech endpoint: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
2. Streaming Create Speech endpoint: https://elevenlabs.io/docs/api-reference/text-to-speech/stream
3. Streaming guide: https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/streaming
4. List voices endpoint: https://elevenlabs.io/docs/api-reference/voices/get-all
5. Voice metadata endpoint: https://elevenlabs.io/docs/api-reference/voices/get
6. Official Python SDK source/package: https://github.com/elevenlabs/elevenlabs-python and https://pypi.org/project/elevenlabs/

Observed interface shape in the official docs:

- Synchronous REST endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`. The documented body includes `text` and `model_id`; output format is selected by query parameter. The response is audio bytes, not JSON text. Use an SDK method such as `text_to_speech.convert(...)` only after verifying the installed version's signature.
- Streaming REST endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`. It returns an audio stream; handle chunks and playback/file writing correctly.
- The docs currently show `eleven_multilingual_v2` in a TTS example, but do not hardcode a model or voice without checking present availability and suitability.
- Voice IDs are configuration, not display names. Get the voice list or require an explicit `ELEVENLABS_VOICE_ID`; do not guess one.
- An async generation endpoint (`/v1/flows/text-to-speech`) exists for lifecycle-based generation and model options not offered by the direct endpoint. It is probably unnecessary for short gap prompts; use direct synchronous TTS unless verified requirements justify async generation.
- Check current rate limits, character pricing, supported languages/voices, audio format, timeout handling and SDK return type. Never log API keys or write raw audio into the repository unless the feature explicitly requires it.

TTS smoke test:

1. Convert a short synthetic gap question to audio with a configured voice/model and write it to a temporary file.
2. Verify the output is non-empty audio and can be played/decoded by an available local player; confirm the API call's model and output format in the test log without logging secrets.
3. Test no voice configured, bad credentials, rate limit, and network timeout; show an actionable error and preserve the text question.

### ElevenLabs single-use tokens for client-side audio

Primary reference: https://elevenlabs.io/docs/api-reference/tokens/create

The documented endpoint is `POST https://api.elevenlabs.io/v1/single-use-token/{token_type}`. The reference lists token types including `realtime_scribe`, `batch_scribe`, and `tts_websocket`, and describes a time-bound token that expires after 15 minutes and is consumed on use. Re-check allowed token types and semantics before using them.

Use this for a browser/client connection only when the relevant service's docs call for it. The secret `ELEVENLABS_API_KEY` stays on the Python server. A local HTML page must request a short-lived token from the local server rather than embed the long-lived key. Token minting is itself an authenticated API call and needs error handling and rate limiting.

### Local Whisper fallback

Use a local transcription engine with no ElevenLabs key and no network dependency at runtime. Two candidate references are below; the agent must choose one and test it on the supported platforms rather than mixing their APIs.

Option A — OpenAI Whisper Python package:

- Repository / API implementation: https://github.com/openai/whisper
- `transcribe(..., word_timestamps=True)` enables word-level timestamps, documented in the implementation; the agent must verify output structure and runtime dependencies for the pinned version.
- FFmpeg installation and supported media handling must be tested for `.m4a`, `.wav`, and `.mp3`.

Option B — faster-whisper:

- Repository and usage: https://github.com/SYSTRAN/faster-whisper
- Its transcription options include `word_timestamps=True`; output is iterator/generator-based and must be consumed correctly.
- It has different runtime dependencies and performance characteristics from `openai-whisper`. Benchmark on a short test capture before selecting it.

Local fallback checklist:

- Test from a clean environment with no API keys and no network access.
- Match the provider-neutral transcript schema used by ElevenLabs as closely as possible: file identity, language if available, segment/word text, start/end offsets and raw provider result / diagnostic metadata.
- Do not pretend timestamps have the same confidence or precision across providers.
- If exact word timing is unavailable, record that fact explicitly; don't synthesize fake precision.

## 3. Supporting references required by later implementation steps

### Mermaid syntax and parse validation

- Flowchart and subgraph syntax: https://mermaid.js.org/syntax/flowchart.html
- Mermaid CLI official repository and usage (`mmdc -i input.mmd -o output.svg`): https://github.com/mermaid-js/mermaid-cli

The agent must test how its chosen Mermaid CLI version exposes parse failures. The requirement is to reject invalid `.mmd` output, not merely to render valid examples. Inferred links use dashed arrows and an `inferred` label; each node and edge still needs a source comment.

### Local Gemma 4 inference (only if local/offline generation is implemented)

- Official Gemma 4 model card: https://ai.google.dev/gemma/docs/core/model_card_4
- Official Hugging Face Gemma 4 documentation entry point: https://huggingface.co/docs/transformers
- Official Hugging Face Transformers source: https://github.com/huggingface/transformers
- Ollama API documentation (if Ollama is selected as a local server): https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama Gemma model library entry point: https://ollama.com/library

The agent must make an explicit provider decision before implementing local mode: Transformers in-process, an Ollama local server, or another documented local runner. These have different model names, multimodal support, context settings, JSON controls, dependencies, and request formats. Verify Gemma 4 image input and structured JSON behavior through the exact chosen runner, rather than assuming support from the model card alone.

### OpenCode project instructions

- OpenCode instruction-file documentation: https://opencode.ai/docs/rules/
- OpenCode agent configuration: https://opencode.ai/docs/agents/

OpenCode supports project-level `AGENTS.md` instructions. Put the short, durable rules there; keep detailed API notes and inspected documentation links under `docs/references/` and link to them from `AGENTS.md`.

## 4. Suggested reference files to create in the repository

```text
docs/
  references/
    README.md                         # index; checked date; official links
    gemini-gemma4-api.md              # hosted model IDs, Python SDK call, limits, images, JSON schema
    elevenlabs-batch-stt.md           # endpoint, SDK method, word timing, keyterms, response/errors
    elevenlabs-realtime-stt.md        # WebSocket, audio format, events, timestamps, reconnect/backpressure
    elevenlabs-agents.md              # create/configure, SDK, voice conversations, auth, transcripts/tools
    elevenlabs-tts.md                 # synchronous/streaming speech, voices, formats, pricing
    whisper-local.md                  # selected engine, offline verification, word-time behavior
    mermaid-validation.md             # parser/CLI version and reproducible validation command
    local-gemma4.md                   # only if local inference is actually implemented
```

For each reference file, record:

- Canonical official URL(s)
- Date checked and package version checked
- What endpoint / model / method is actually used
- Request parameters and exact output schema relevant to Devlog
- Authentication and environment variables
- Limits, errors, timeouts, retries and pricing considerations
- A minimal tested example and the command/output used to verify it
- Unresolved questions (must not be papered over)

## 5. Required API smoke tests before integrating the full pipeline

1. **Batch ElevenLabs:** transcribe a short sample; assert the saved raw JSON contains the full provider response and word timestamps where requested.
2. **Keyterms:** run a separate short sample with `keyterms.txt`; verify exact request parameter name and behavior from returned text, but don't require a particular transcript unless a stable fixture exists.
3. **Local Whisper:** transcribe the same sample with no `ELEVENLABS_API_KEY`; verify zero network dependency and produce the normalized transcript schema.
4. **Gemma 4 text:** send a tiny timeline; verify output extraction, failure/finish status handling and the configured hosted model ID.
5. **Gemma 4 images:** submit one local image plus short text; verify the selected method and image constraints.
6. **Gemma 4 JSON:** ask for a tiny object matching the exact live-op schema; validate with Pydantic or an equivalent strict validator. Include unknown fields, malformed JSON, missing fields, invalid enum/op name and invalid node IDs in validator tests.
7. **Realtime connection:** with a short controlled session, verify session start, partial and committed event handling, timestamp correlation, orderly shutdown and error propagation.
8. **Failure/backlog test:** force Gemma generation to fail while transcription continues; confirm the raw transcript is complete and pending work is retried later.

Do not turn smoke tests into billed live API calls in the default pytest suite. Use fixtures and mark intentional live tests separately.

## 6. Questions that must be surfaced instead of guessed

1. **Hosted vs local model:** The product idea expects both Gemini API use and local/offline Gemma. Is local inference part of the first milestone or a separate later milestone? If both are in scope, which local runner is preferred?
2. **Model choice:** Hosted Gemma 4 documentation currently lists `gemma-4-31b-it` and `gemma-4-26b-a4b-it`. Which should be the default, subject to current account availability, limits, and cost?
3. **Realtime event log:** Should `out/live/raw.jsonl` preserve all partial events and all committed events, or only committed transcript chunks? The log must be append-only either way, but the intended semantics need to be explicit.
4. **API key policy:** For CLI/server-side realtime, keep `ELEVENLABS_API_KEY` only in process environment. If a browser ever connects directly, use single-use tokens and never expose the secret.
5. **Cost constraints:** What per-demo or per-session API budget should the agent assume? In particular, batch keyterms and some transcript options incur additional charges.

If any answer is essential to the build step currently being attempted and is absent, stop after documenting the blocker. Do not block unrelated steps that can be completed without it.

## 7. Compact research instruction to paste into OpenCode

> Before implementing any external API call, inspect the official documentation and the official SDK source linked in `docs/references/API_LOOKUP.md` (or this file if used as the lookup pack). Save a concise reference note with the canonical URLs, date checked, exact SDK version, model ID, request fields, response fields, limits, error behavior, and a minimal tested example. Verify the installed SDK signatures and run a tiny smoke test before integrating. For Gemini/Gemma, verify hosted model availability, image input and structured JSON support for the exact chosen model. For ElevenLabs, research batch Scribe v2, realtime Scribe v2, ElevenAgents, and standalone TTS as separate products. Never guess fields, model IDs, event names, timestamps, authentication/token behavior, or retry behavior. Do not use an Agents transcript as a substitute for the immutable Scribe raw-event log. If required facts remain unverified, stop and report the exact missing doc or detail.
