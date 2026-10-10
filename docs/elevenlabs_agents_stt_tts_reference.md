# ElevenLabs API Lookup Pack for Devlog

**Checked:** 2026-10-10  
**Purpose:** Official API/SDK references for ElevenAgents, batch and realtime speech-to-text, standalone text-to-speech, and browser-safe audio authentication. This is a research guide for OpenCode, not a claim that every API call has been implemented or tested.

## 1. Keep the products separate

| Product | What it does | Potential use in Devlog |
|---|---|---|
| **Scribe v2 batch STT** | Transcribes an existing audio file; can return word-level timestamps. | Recorded voice memos in `capture/audio/`. |
| **Scribe v2 Realtime STT** | Streams microphone audio to a transcription WebSocket and emits interim/final transcript events. | Live build-session capture. Raw events must be durably logged before any model processing. |
| **ElevenAgents** | Full conversational stack: speech recognition, language model, speech synthesis, and turn-taking. | Optional voice interviewer that asks `GAPS.md` questions and collects answers. Not a replacement for the Scribe raw-event log unless the product spec is deliberately changed. |
| **Standalone Text-to-Speech (TTS)** | Converts supplied text into audio, synchronously or as a stream. | Optional feature to read gap questions aloud, without building a full agent. |
| **Single-use tokens** | Short-lived tokens for supported client-side audio connections. | Let the local web page connect without exposing the long-lived API key. |

An ElevenAgents conversation may return a useful transcript, but Devlog's live capture has stricter needs: an append-only raw transcript/event log, source spans, timestamps, and downstream graph processing that continues even when Gemma 4 fails. Do not assume the agent transcript API satisfies these requirements without testing.

## 2. Official reference index

### ElevenAgents

- [ElevenAgents overview and architecture](https://elevenlabs.io/docs/eleven-agents/overview)
- [Quickstart](https://elevenlabs.io/docs/eleven-agents/quickstart)
- [Official Python SDK guide](https://elevenlabs.io/docs/eleven-agents/libraries/python)
- [Create agent API](https://elevenlabs.io/docs/api-reference/agents/create)
- [Get agent API](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/get)
- [List agents API](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/list)
- [Update agent API](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/update)
- [WebSocket integration guide](https://elevenlabs.io/docs/eleven-agents/libraries/web-sockets)
- [Get signed URL](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-signed-url)
- [Get WebRTC token](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token)
- [Get conversation details and transcript](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get)
- [Get conversation summary](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-summary)
- [Web widget](https://elevenlabs.io/docs/eleven-agents/customization/widget)
- [Authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication)
- [Tools overview](https://elevenlabs.io/docs/eleven-agents/customization/tools)
- [Webhook tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools)
- [Client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools)
- [Knowledge base](https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base)
- [Dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables)
- [Official Python SDK source](https://github.com/elevenlabs/elevenlabs-python)
- [Official Python package](https://pypi.org/project/elevenlabs/)

### Speech-to-text

- [STT overview and model capabilities](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)
- [Batch STT endpoint](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- [Batch STT Python guide](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text)
- [Realtime STT WebSocket endpoint and event schema](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- [Realtime server-side Python guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/server-side-streaming)
- [Realtime client-side guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming)
- [Single-use token endpoint](https://elevenlabs.io/docs/api-reference/tokens/create)
- [Official Python SDK source](https://github.com/elevenlabs/elevenlabs-python)

### Text-to-speech

- [Create speech (synchronous)](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Stream speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream)
- [TTS streaming guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/streaming)
- [List voices](https://elevenlabs.io/docs/api-reference/voices/get-all)
- [Get voice metadata](https://elevenlabs.io/docs/api-reference/voices/get)
- [Official docs index](https://elevenlabs.io/docs/llms.txt)

## 3. Batch transcription: recorded audio

**Documented endpoint:** `POST https://api.elevenlabs.io/v1/speech-to-text`  
**Model ID shown in official examples:** `scribe_v2`  
**Request type:** multipart form data, with an audio file.

Relevant features include word-level timestamps and keyterm prompting. The current documentation says batch keyterms support up to 1,000 terms, subject to per-term restrictions and additional charges. Do not rely on this summary alone: re-check the exact limits, parameter names, supported media formats, file-size limits, and billing in the endpoint reference before coding.

Agent must verify:

- Exact installed-SDK signature for the transcription call and how to pass a path/file handle.
- Whether `.m4a`, `.wav`, and `.mp3` are supported directly through the chosen request path and any file-size/duration limits.
- Exact raw JSON response schema, including word start/end offsets, speaker information if present, language fields, and error responses.
- Whether timestamps are relative to each source file and how offsets are represented.
- `keyterms` parameter name/type/limits and current price impact.
- Safe serialization of the complete raw SDK response to `out/transcripts/`.
- Retry behavior: do not retry bad credentials or invalid requests as though they were transient outages.

**Devlog invariant:** store the unmodified provider response as raw JSON; produce a separate normalized transcript representation for timeline merging. Preserve original offsets and source-file identity.

## 4. Realtime transcription: live build-session capture

**Documented WebSocket:** `wss://api.elevenlabs.io/v1/speech-to-text/realtime`  
**Model ID:** `scribe_v2_realtime`  
**Audio examples:** `pcm_16000`; the current reference lists supported audio formats and requires a compatible sample rate/configuration. Verify the exact chosen capture format rather than blindly sending microphone bytes.

The official schema documents `input_audio_chunk` client messages, `partial_transcript` interim events and `committed_transcript` stable events. Depending on configuration, additional events can convey timestamps, language detection, entity information, warnings, or errors. The spec includes both manual commit and VAD-based commit strategies. Realtime keyterm limits differ from batch limits; do not reuse batch assumptions.

Agent must verify:

- Exact SDK method names, event classes, and signatures for the pinned `elevenlabs` package.
- Microphone library, sample rate, bit depth, channel count, chunk encoding, resampling and conversion.
- Which transcript events are persisted, how partials are correlated with committed text, and how timestamp-bearing events are paired with transcript segments.
- Keepalive, manual/VAD commit strategy, session shutdown, reconnect behavior, timeouts and rate-limit handling.
- How source spans are computed and whether the API delivers timestamps in the required granularity.
- Keyterm and language options and current pricing/limits.

**Devlog invariants:**

1. Append raw incoming events to `out/live/raw.jsonl` before queuing Gemma processing; never edit prior entries.
2. Treat partials as mutable interim content, not independent final utterances. Correlate or deduplicate them so they do not generate duplicate graph updates.
3. A speech/LLM failure must not discard captured raw events. Save the backlog and process it later.
4. Every produced live note must cite the exact raw transcript span. Never invent timestamps when better provider timing is available.
5. Keep the local Whisper fallback working without `ELEVENLABS_API_KEY`.

**Client security:** the long-lived `ELEVENLABS_API_KEY` stays server-side. Where a browser connects directly, use the documented single-use token flow.

## 5. ElevenAgents: create, connect, converse, retrieve

### Agent lifecycle API

The official create-agent route is `POST https://api.elevenlabs.io/v1/convai/agents/create`. The documented request requires a `conversation_config`; other fields can include `platform_settings`, `workflow`, `name` and `tags`. The API returns an `agent_id`. The API reference notes that agents are versioned and the former `enable_versioning` query parameter is deprecated/ignored.

Before writing agent-management calls, inspect the current create/get/list/update pages and the SDK types. Verify required nested configuration, defaults, versioning behavior, workflow/tool schemas, validation errors, rate limits and how to update an existing agent. Do not construct a large config object from guessed field names.

**Prefer an existing configured agent** for a local demo: expose `ELEVENLABS_AGENT_ID` as optional configuration. Never create a fresh hosted agent every time Devlog starts. If no agent exists and automated creation is explicitly required, create it as a distinct setup command and save the returned ID to user configuration, not source control.

### Python SDK conversation

The official Python guide demonstrates imports from `elevenlabs.client`, `elevenlabs.conversational_ai.conversation`, and `elevenlabs.conversational_ai.default_audio_interface`. It demonstrates a `Conversation` object, callbacks for agent output/corrections and user transcript, `start_session()`, `end_session()`, and `wait_for_session_end()`. The `pyaudio` extra may be needed for the default audio I/O implementation and can require OS-level audio libraries.

Before use, pin the package version and verify those imports/signatures against the installed source. Choose the Python SDK for a Python CLI/microphone session; use the browser SDK/WebSocket/widget docs when the conversation lives in the local web page.

### Low-level WebSocket and browser connection

The official Agents WebSocket guide documents `wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}` and event families such as user transcript, agent response, response correction, audio, interruption, ping, and streamed response parts. It also documents using a signed URL for private agents. Inspect the complete event schema: examples are not exhaustive.

For private-agent access, the signed-URL route is `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=...`, authenticated server-side. Return only the signed URL to the browser. Never put `xi-api-key` in HTML, JavaScript, logs, or client-visible config. Verify URL expiry/reuse constraints, event ordering, ping/pong, audio queueing and orderly disconnect.

### Transcript recovery

The conversation-details route is `GET https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}`. The documented response includes conversation status and a transcript array with speaker role, message, call-relative timing and potentially tool-call metadata. Verify when transcripts become final and whether failed/abandoned sessions still produce retrievable transcripts. Persist the conversation ID and raw API response as needed for provenance; do not claim timestamps are identical to Scribe word-level timestamps.

A summary endpoint also exists at `/v1/convai/conversations/{conversation_id}/summary`. It is not a substitute for the full transcript when raw turns or tool calls are needed.

### Tools, knowledge and project integration

ElevenAgents has several distinct tool types: client tools, webhook tools, code tools, MCP tools and system tools. Read the official tools index and the specific implementation docs before configuring one.

- Client tools execute in the browser/client application.
- Webhook tools call an API endpoint. A hosted ElevenLabs service cannot reach a user's `localhost` directly; do not assume a webhook can mutate Devlog's local files. A reachable backend/tunnel would be an architectural change and must be explicitly approved.
- Knowledge-base retrieval is optional and should not be added unless the gap-interview behavior needs it.
- Dynamic variables/overrides may pass project context or the current gap question. Verify the real schema and whether it is supplied at conversation initiation or via later client messages.

### Privacy, cost and failure behavior

Research current pricing, usage calculation, concurrency/rate limits, retention/audio settings, transcript and audio retrieval, deletion behavior, auth mode, and post-call processing. Make clear to the user when audio/transcripts are sent to ElevenLabs. Add timeouts, recoverable errors, and explicit user-visible failures; do not silently discard the answer.

## 6. Standalone TTS: read the gap questions aloud

**Synchronous endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`  
**Streaming endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`

Official examples include `text` and `model_id` in the request body; output format is controlled by the documented query parameter. The direct endpoint returns audio bytes / an audio stream, not a JSON transcript. An async generation endpoint also exists at `/v1/flows/text-to-speech`, but likely is unnecessary for short gap questions.

Agent must verify:

- Current Python call name/signature for `text_to_speech.convert()` or `.stream()` in the pinned SDK.
- A valid voice ID via the voices API or explicit `ELEVENLABS_VOICE_ID`; never guess a voice ID.
- Model availability, language support, format, output MIME type, rate limits, cost per character and timeout behavior.
- Whether to save an audio file or stream to the playback device. Do not write generated audio into the repository unless explicitly required.

Keep this feature distinct from a full voice agent. If Devlog only needs spoken questions, TTS plus Scribe for answer transcription is a smaller architecture. If the user expects a natural multi-turn interview with agent-generated follow-ups, evaluate ElevenAgents instead and document the tradeoffs.

## 7. Single-use tokens for browser-side audio

Reference: [Create Single Use Token API](https://elevenlabs.io/docs/api-reference/tokens/create)

The documented endpoint is `POST https://api.elevenlabs.io/v1/single-use-token/{token_type}`. The reference currently lists `realtime_scribe`, `batch_scribe`, and `tts_websocket` token types, and describes a time-limited token with 15-minute expiry that is consumed on use. Re-check supported token types and semantics for the specific API path before implementation.

The frontend requests a token from Devlog's local Python server; the server uses `ELEVENLABS_API_KEY` and returns only the short-lived token. Never hardcode or bundle the API key in the local page. Handle token-expired/reused tokens and failed token creation explicitly.

## 8. Recommended Devlog architecture decision

Do not integrate every ElevenLabs product simply because it exists. Make this decision explicit in `docs/references/elevenlabs-architecture.md`:

- **Recorded audio:** batch Scribe v2.
- **Live build capture:** realtime Scribe v2 plus append-only raw event storage and local Whisper fallback.
- **Spoken gap questions only:** optional standalone TTS; transcribe the answers with the selected STT backend.
- **Conversational voice interviewer:** optional ElevenAgents. Integrate only if the product requirements call for an actual agent. Preserve agent conversation records as a separate source; define how answers enter the timeline with their own provenance.

The initial `prompt.md` names only `GEMINI_API_KEY` and `ELEVENLABS_API_KEY`. If agent ID or voice ID configuration is introduced, update `.env.example`, README, validation and tests together. Do not invent secrets, voice IDs, agent IDs or model IDs.

## 9. Minimum smoke tests

1. **Batch Scribe:** transcribe a short fixture; save raw JSON and assert expected word timestamp fields exist when requested.
2. **Keyterms:** verify the exact parameter and validation behavior; keep cost-sensitive calls out of default pytest.
3. **Realtime Scribe:** verify connect, session-start, partial, committed event, timestamp correlation, keepalive, orderly shutdown and raw-log durability.
4. **No-key fallback:** run local Whisper with no ElevenLabs key and no network dependency.
5. **Agents auth:** test public agent and protected-agent flows separately; ensure the long-lived API key never appears in browser-visible output.
6. **Agents conversation:** test start, callbacks, correction event, end-session and conversation ID recovery; then fetch the transcript and verify status/shape.
7. **Agent failure/backlog:** interrupt or fail the agent connection and check whether user speech already captured locally remains saved. Do not rely on remote history as the only copy.
8. **TTS:** synthesize a short synthetic question, verify playable non-empty audio, and test invalid voice/auth/timeout errors.
9. **Cost/security:** document which tests hit billable live APIs and mark them `@pytest.mark.live`; redact credentials and avoid logging audio/transcripts unless needed for the required local raw record.

## 10. Instructions to OpenCode

> Read `idea.md`, `prompt.md`, and this lookup pack before adding any ElevenLabs integration. Consult the linked official docs and current SDK source, pin and inspect the installed version, and write focused notes to `docs/references/`. Research ElevenAgents, batch Scribe v2, realtime Scribe v2, standalone TTS, and single-use tokens as separate APIs. Verify exact endpoint, model/voice identifiers, request schema, response/event schema, limits, timestamps, SDK signatures, authentication, retention, cost, timeout and retry behavior. Build and run a minimal smoke test for each API before integrating it. Preserve the raw Scribe event log independently of any agent transcript. Never expose the long-lived API key to the browser, never guess missing API details, and stop with the precise missing reference if the official docs and SDK do not settle a requirement.
