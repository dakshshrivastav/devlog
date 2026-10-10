# Devlog — Action Plan

**Status:** The Node/TypeScript application foundation, fixture-backed dynamic UI, local API, batch provider adapters, and realtime Scribe transport are implemented. Automated local checks pass; provider-account and browser microphone smoke tests remain pending.
**Updated:** 2026-10-11
**Product specification:** [`idea.md`](idea.md)  
**Implementation prompt:** [`prompt.md`](prompt.md)  
**Detailed requirements/reference pack:** [`docs/devlog_api_lookup_pack (1).md`](docs/devlog_api_lookup_pack%20(1).md)

## 1. Goal

Build Devlog, a local web application, that turns a project build session—voice recordings, photos, notes, and Git history—into source-backed documentation, observer notes, Mermaid diagrams, and gap questions. Preserve the raw evidence so generated claims can be checked. The current implementation is Node.js + TypeScript; see [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the operative architecture and milestones.

The product's central constraint is trustworthiness: claims, notes, diagram nodes, and links must be traceable to evidence. Unsupported information becomes a question in `GAPS.md`; the model must not invent it.

## 2. Current project state

- A working application source tree and `.gitignore` now exist.
- Git repository initialized on `main`; baseline `f3265fb` and application foundation `d2aa2c2` use the planned messages.
- Automated verification: strict client/server TypeScript checks, fixture-backed Vitest tests, production Vite build, and local API smoke tests pass. No billed provider call or real microphone/provider run has been performed.
- Git evidence is read-only: Devlog extracts full commit IDs, author timestamps, and subjects through NUL-delimited `git log` output. It does not rewrite or stage repository history.
- Existing planning and reference files to preserve:
  - `idea.md`
  - `prompt.md`
  - `docs/devlog_api_lookup_pack (1).md`
  - `docs/google_cloud.md`
  - `docs/elevenlabs.txt`
- `docs/google_cloud.md` and `docs/elevenlabs.txt` are broad provider reference indexes. Keep public-facing, curated documentation under `docs/`; put internal downloaded material or working notes under ignored `docs/assets/`.
- Application source, templates, static styles, and prompts are in `devlog/`; curated provider notes are in `docs/references/`.

## 3. Decisions and constraints recorded so far

### Confirmed (current implementation decisions)

- **Language:** TypeScript on Node.js for both frontend-adjacent server code and the API.
- **Interface:** local browser UI; no CLI is currently in scope.
- **Web framework:** Express 5; pipeline and provider logic stay outside route handlers.
- **Frontend:** React 19 + Vite 8 + Tailwind v4, preserving the Stitch editorial visual reference.
- **Shared contract:** strict zod schemas in `shared/` provide the single source of truth for client and server.
- **Hosted generation:** Gemini Developer API through `@google/genai`, default `gemma-4-26b-a4b-it`; `GEMMA_MODEL` may override it. Cloud MaaS is unselected.
- **Speech:** Scribe v2 batch transcription for recorded sessions; Scribe v2 Realtime WebSocket for live sessions. The long-lived key stays server-side and live browser connections use single-use tokens.
- **Live graph:** Gemma updates an append-only idea graph from committed transcript chunks; server history and current graph state are kept separately.
- **Gap interview:** typed answers are implemented; spoken gap answers remain a follow-up.
- **Timeline policy:** timezone-aware items sort by normalized UTC instant; timezone-naive EXIF values remain naive and follow aware instants; untimed evidence follows dated evidence; ties break by stable source ID. Speech-to-commit association is not implemented.
- **Generated output:** session-local under the ignored `DATA_DIR`, downloadable as a ZIP; never written into the target Git repository automatically.
- **Mermaid:** sourced hardware/idea graph structures are serialized into a restricted flowchart subset, validated server-side, and rendered by Mermaid.js in the browser.
- **Documentation locations:**
  - Internal-only reference material and downloaded assets: `/docs/assets/`; add this path to `.gitignore`.
  - Documentation intended for third-party readers: `/docs/`; track it in Git.
- **License:** use MIT, as already specified in `prompt.md`.
- **Initial repository commits:** use the two exact messages listed in Section 5.
- **Secrets and raw user captures:** keep API credentials and private capture media out of version control.

### Resolved / remaining decisions

1. **Gemma constrained output:** no Gemma-specific JSON schema mode is assumed; locally validate plain text. Revisit if the selected model's current support is verified.
2. **Live graph contract:** deferred with live mode; JSON op schemas, cluster policies, merges, and append-only history need a separate design pass.
3. **Offline Mermaid rendering:** the recorded MVP writes Mermaid source; bundle local rendering assets when live mode is implemented.

## 4. Provider findings and implementation implications

### Google Gemma 4

As checked against the official documentation on 2026-10-10, Google Cloud's managed open-model catalog describes **Gemma 4 26B A4B IT** as the Gemma 4 MaaS model. Its documented model ID is `gemma-4-26b-a4b-it-maas`; the model page marks it experimental and lists text/image input and text output, with no audio or video input. The managed model page lists structured output and function calling as supported. Recheck all of these details when implementing because model availability and limits can change.

The Cloud MaaS API guide documents an OpenAI-compatible client path and Application Default Credentials. The Cloud REST `generateContent`/streaming references are also useful API references; select the call path that the specific model's current documentation supports and verify image and schema behavior against that path.

The separate Gemini API guide documents `gemma-4-31b-it` and `gemma-4-26b-a4b-it` through Google AI Studio. Do not use these Gemini API model IDs as Cloud MaaS IDs. The Gemma 4 model card describes the broader family, including audio support on smaller variants; that does not make audio supported by the Cloud MaaS 26B model.

**Application implications:** send the normalized timeline and selected images to the chosen Gemma 4 endpoint; use a structured response for claims, source references, observer notes, diagrams, and gaps where supported; then validate it in application code. Use Scribe/Whisper for audio transcription rather than assuming the Cloud MaaS model accepts audio.

### ElevenLabs Speech-to-Text and Agents

- The batch Speech-to-Text API documents Scribe v2 (`scribe_v2`) and word-level transcript timing. Keyterm prompting is supported; batch and realtime have different limits, so validate the terms from `keyterms.txt` before sending them.
- Realtime Scribe is a separate WebSocket API using `scribe_v2_realtime`; its event protocol, audio format, commit strategy, timestamp settings, and authentication differ from batch transcription.
- Single-use tokens are documented for browser-side STT access. Prefer keeping the long-lived ElevenLabs API key on the Python server.
- ElevenLabs Agents support text-only chat mode as well as realtime conversations. For a browser client connected to a protected agent, the server can request a signed URL; never expose the workspace API key to browser code. Agent WebSocket events include user transcripts and agent responses.
- If an Agent is used to conduct a spoken gap interview, keep its conversation handling separate from batch transcription used to create the evidence timeline. Preserve raw source audio/transcripts and source spans where the selected APIs provide them.

## 5. Repository initialization and commit sequence

### Commit 1 — repository baseline

1. Create `.gitignore` **before running any `git add` command**.
2. Include the required exclusions:
   - Secrets/environment files: `.env*`, `*.pem`.
   - Dependencies: `node_modules/`, `venv/`, `.venv/`.
   - Build output: `dist/`, `build/`, `*.out`.
   - Logs and OS/IDE clutter: logs, `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`.
3. Add Python-specific generated files/caches and web build/dependency outputs if used.
4. Add `/docs/assets/` and the agreed local capture/work-data locations. Do not ignore `/docs/` as a whole.
5. Add a root README, MIT license, Python dependency/build manifest, and the existing planning/reference files. The manifest and framework-dependent setup details should match the choices recorded in Section 3.
6. Initialize the repository and explicitly stage intended paths. Do not use `git add .` blindly.
7. Before committing, inspect `git status`, the staged file list, and staged diff. Check that no secrets, raw private media, generated files, or unexpected dependency trees are staged. Confirm ignored paths behave as intended.
8. Commit with the exact message:

   `chore: initialize project repository and base configuration`

### Commit 2 — application foundation

1. Add the real Python application structure and configuration; do not create an empty or placeholder source commit.
2. Add only source files and intended configuration; stage explicit paths and inspect the staged status/diff again.
3. Commit with the exact message:

   `feat: add initial project structure and source code`

4. Verify the two commits and confirm the working tree is clean.

## 6. Documentation and reference-file organization

```text
docs/                         # Tracked documentation for third-party readers
  README.md                   # Documentation index
  references/                 # Curated provider integration notes and canonical links
  assets/                     # Internal working material; ignored by Git
```

- Keep public integration notes concise: explain which API path the project uses, relevant constraints, setup, and how to verify it. Link to the canonical official source and record when it was checked.
- Keep temporary downloaded copies, excerpts, and internal research artifacts under `docs/assets/`; they remain local and untracked.
- Do not copy entire vendor documentation dumps into tracked docs. Prefer canonical links plus a short implementation-focused summary.
- Preserve and review the existing `docs/google_cloud.md` and `docs/elevenlabs.txt`; incorporate useful canonical links into the curated reference index rather than duplicating the full indexes.
- Do not commit API keys, `.env` files, private audio/video/photos, personal capture folders, or generated raw transcripts by default. Track only intentionally prepared, license-compatible fixtures.

## 7. Historical MVP implementation roadmap

The Python/FastAPI roadmap below was the earlier repository specification and is superseded by [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md), which tracks the current Node/TypeScript implementation.

Implement one milestone at a time. After each milestone, report the files/features changed, exact commands/tests run, actual results, and what remains unverified. Do not claim a feature works before running it.

### Milestone 0 — settle interfaces and provider contracts

- Resolve the decisions in Section 3 that affect the repository manifest, web interface, authentication, output paths, and API adapters.
- Recheck official provider documentation and SDK sources before writing calls. Record exact model IDs, endpoint paths, request/response schemas, limits, timestamp semantics, and error cases in tracked `docs/references/` notes.
- Create synthetic capture/timeline fixtures and an end-to-end acceptance checklist before connecting paid APIs.

### Milestone 1 — recorded-session path

1. Establish Python package/project configuration and the agreed local web entry point. If CLI support remains in scope, keep it as a thin interface to the same application services.
2. Accept a capture directory containing audio, photos, optional `notes.txt`, and optional `keyterms.txt`, plus a path to the project's Git repository.
3. Implement a transcription adapter:
   - ElevenLabs Scribe v2 batch transcription with raw response saved under the selected output's `transcripts/` directory.
   - `--stt whisper` local fallback that works without an ElevenLabs key or ElevenLabs network access.
4. Build a deterministic, time-sorted timeline from transcript spans, photos, notes, and Git commits. Give every item a stable source ID/tag and retain original timestamp metadata.
5. Implement the selected Gemma 4 provider adapter. Pass the timeline and supported image inputs; keep prompts in `prompts/` and make separate generation calls for each required output where the spec requires it.
6. Generate source-backed `README.md`, `OBSERVER_NOTES.md`, `diagrams/system.mmd`, and `GAPS.md` in the user-selected output directory.
7. Validate all outputs in code. Retry invalid generation once; if still invalid or unsupported, omit it and add a gap question. Never save malformed Mermaid or unsupported claims.
8. Build the minimum web UI for selecting inputs, viewing progress/results, and reviewing gaps. Do not overwrite Devlog's root README or `/docs`.

### Milestone 2 — live mode

- Add `devlog live` only if CLI remains part of the agreed interface; otherwise expose the same flow in the local web UI.
- Stream microphone audio to Scribe v2 Realtime, with the local Whisper fallback if feasible and documented.
- Persist each complete raw transcript chunk before invoking Gemma; keep raw records immutable.
- Have Gemma return a short note and schema-validated graph operations for each chunk. Reject/log bad operations without losing raw transcript data or crashing the session.
- Maintain current graph state plus append-only history; preserve source spans and timestamps on notes, nodes, and edges.
- Render clusters as Mermaid subgraphs. Serve Mermaid assets locally for offline use.
- Implement the unify step only after the graph schemas and provenance rules are fixed. Unrelated clusters stay separate and produce a gap question.
- Add ElevenLabs Agent-based gap interviews only if confirmed in Section 3. Use server-issued signed URLs/tokens for browser connections; keep provider keys on the server.

### Later scope

- Video ingestion with ffmpeg audio extraction and capped, timestamped frame sampling.
- Spoken gap questions using ElevenLabs text-to-speech.
- `DEVLOG.md`, `BOM.md`, `TROUBLESHOOTING.md`, and additional supported diagrams.
- Optional Mermaid SVG rendering; `.mmd` remains canonical.

## 8. Acceptance checks

Use fixture-backed tests by default; mark live API tests separately so the normal suite needs no credentials and incurs no API costs.

- **C1:** every factual claim has a source.
- **C2:** a planted false detail is not stated as fact.
- **C3:** a missing fact becomes a gap question.
- **C4:** verify project keyterms improve/affect technical-word transcription using an appropriate fixture or explicit live test.
- **C5:** spoken notes associate with commits under the documented time-matching rule.
- **C6:** Whisper path works without an ElevenLabs key.
- **C7:** diagram boxes and arrows are source-supported; removing evidence removes the unsupported element.
- **C8:** every saved Mermaid file parses.
- **C9:** observer notes have no first-person whole-word matches (`I`, `we`, `my`, `our`).
- **C10:** observer notes do not invent motives or feelings.
- **C11:** live note condensation preserves names, numbers, units, negations, and relationships.
- **C12:** graph operations are grounded in the chunk or existing graph state.
- **C13:** every live note maps to an immutable raw transcript span.
- **C14:** Gemma failure does not lose raw transcript; backlog can be processed later.
- **C15:** spoken corrections update current graph while retaining prior state in history.
- **C16:** topic A → topic B → topic A creates B separately and reuses A's cluster.
- **C17:** unrelated clusters stay unlinked and generate a gap question.
- **C18:** cross-cluster links have sources; inferred links are marked; history is never deleted.

## 9. Official provider reference index

Recheck these live sources during implementation. URLs and model capabilities can change; this plan is not itself a guarantee that an API call has been tested.

### Google Cloud / Gemma 4

- [Google models on Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/google) — managed model catalog.
- [Gemma 4 26B A4B IT MaaS model page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/google/gemma-4-26b-a4b-it) — Cloud model ID, modalities, capabilities, launch status, quota, and region details.
- [Call MaaS APIs for open models](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/call-open-model-apis) — request/streaming examples and MaaS client integration.
- [REST `generateContent`](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/projects.locations.endpoints/generateContent) and [REST endpoints resource](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/projects.locations.endpoints) — request/response and streaming REST API references.
- [Structured output for MaaS open models](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/capabilities/structured-output) — JSON/schema output guidance.
- [Function calling for MaaS open models](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/capabilities/function-calling) — tool/function-call contract.
- [Application Default Credentials](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/gcp-auth) and [OpenAI-library authentication](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate/openai/auth-and-credentials) — Cloud authentication.
- [Use Gemma open models on Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/open-models/use-gemma) — broader Cloud Gemma serving context.
- [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4) — model family and modality details.
- [Run Gemma with the Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) — separate Google AI Studio/Gemini API path; do not confuse its model IDs with Cloud MaaS.

### ElevenLabs Agents and Scribe

- [ElevenLabs full documentation index](https://elevenlabs.io/docs/llms.txt) — top-level inventory of product and API docs.
- [ElevenAgents overview](https://elevenlabs.io/docs/eleven-agents/overview), [quickstart](https://elevenlabs.io/docs/eleven-agents/quickstart), and [Python SDK](https://elevenlabs.io/docs/eleven-agents/libraries/python).
- [Chat mode](https://elevenlabs.io/docs/eleven-agents/guides/chat-mode) — text-only conversations and response handling.
- [Create Agent API](https://elevenlabs.io/docs/api-reference/agents/create) and [Update Agent API](https://elevenlabs.io/docs/api-reference/agents/update).
- [Agent authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication) and [Get signed URL API](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url) — protect browser sessions and API credentials.
- [Agent WebSocket API](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket) and [Client events](https://elevenlabs.io/docs/eleven-agents/customization/events/client-events) — conversation messages, transcripts, and streaming responses.
- [Speech-to-Text overview](https://elevenlabs.io/docs/overview/capabilities/speech-to-text), [Python quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text), and [Create transcript API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert) — batch Scribe integration and response schema.
- [Batch keyterm prompting](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text/batch/keyterm-prompting) — project-specific vocabulary and limits.
- [Realtime Scribe API](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime) and [transcript timestamps/commit strategies](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/transcripts-and-commit-strategies) — realtime WebSocket protocol and timestamps.
- [Single-use token API](https://elevenlabs.io/docs/api-reference/tokens/create) and [Get transcript API](https://elevenlabs.io/docs/api-reference/speech-to-text/get) — client token and transcript retrieval references.

## 10. Completion criteria for the initial repository work

- `.gitignore` exists and has been reviewed before any staging.
- Public `/docs` material is trackable; `/docs/assets/` and private captures are ignored.
- No secret, generated media, or dependency tree is staged.
- The baseline and application commits use the exact messages in Section 5.
- The application commit contains real source code.
- The chosen web entry point, deployment/locality scope, provider APIs, and generated-output destination are documented before their implementation.
- Tests and manual checks are reported with actual results; unverified provider behavior is labeled as such.
