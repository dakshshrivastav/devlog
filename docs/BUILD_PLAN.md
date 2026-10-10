# Devlog — Build Plan

Working document for turning the Stitch-generated static prototype into a real tool.
Recorded 2026-10-11. Supersedes nothing; complements [ACTION_PLAN.md](../ACTION_PLAN.md),
which remains the source for provider research and acceptance checks C1–C18.

### Implementation status (2026-10-11)

- **Foundation and fixture-backed web app are implemented.** The nine workspace surfaces
  render session data; session creation/library, uploads, gap write-back, search, SSE updates,
  Mermaid SVG/source downloads and ZIP export use the local API.
- **Provider adapters are implemented but not live-smoke-tested here.** Batch Scribe v2,
  Gemini synthesis, EXIF and Git ingestion are wired. Add the keys to `.env` to use them.
- **Realtime transport is wired.** The server mints one-use Scribe tokens; browser AudioWorklet
  converts mic input to 16 kHz PCM; raw provider events are appended before transcript
  processing. Live idea synthesis is debounced and appends graph history when Gemini is
  configured. Provider-account audio verification remains unrun because this environment has
  no provider credentials.
- **Spoken gap answers are wired.** The browser records an answer; the server transcribes it
  with batch Scribe, retains raw response/audio, and stores the transcript as evidence before
  applying structured write-back.
- **Mock/API verification passed:** gap write-back, raw live-event ingestion, fixture mock run,
  search and ZIP export. `npm run lint`, `npm test` and `npm run build` are the current checks.

Two decisions in ACTION_PLAN §3 are amended here, deliberately:

| ACTION_PLAN §3 | This plan | Why |
| --- | --- | --- |
| Language: Python, FastAPI | **Node + Express + TypeScript** | One language across the stack; the session/evidence/gap model is defined once in `shared/` and typed on both sides. The repo scaffold was already Node. |
| Gap interview: text questions for v1 | Typed and spoken answers | Spoken answers use batch Scribe and become their own voice evidence item. |

Everything else in §3 stands: Gemini Developer API with `gemma-4-26b-a4b-it`, ElevenLabs
Scribe v2 for recorded audio, Scribe v2 Realtime for live capture, filesystem output
outside the source tree, restricted Mermaid subset, MIT license, `.gitignore` before any
`git add`.

---

## 1. Product model

Devlog watches a hardware bench session and writes the documentation the project should
have shipped with. Three evidence streams — spoken narration, bench/scope photos, git
commits — are time-aligned into one timeline, and every artifact is synthesized from that
timeline with a citation on every fact.

Two properties make it more than a transcript wrapper:

1. **Provenance.** Every claim carries `sources: EvidenceId[]`, rendered as `[voice 14:02]`,
   `[photo 2]`, `[commit c4e12a]`. "100% sourced" is a computed number, not a label.
2. **Gaps instead of invention.** When a fact is absent from the evidence, the model files a
   question with a target document and a priority. The builder answers by typing or speaking;
   the answer becomes new evidence and propagates into the affected artifact.

### 1.1 The three graph views are three different structures

The prototype rendered the same hardcoded cluster content three times. They are distinct:

| View | Meaning | Model | Layout engine |
| --- | --- | --- | --- |
| **Living Map** | The devlog proper: chronology / build log / commit history of the project | `ChronologyEntry[]` grouped into `ChronologyPhase[]` | Time on Y, topic lanes on X |
| **Live Flowchart** | How ideas develop; a conclusion surfaces when two nodes from *different* trees end up close | `IdeaGraph` — idea nodes, relation edges, thought clusters, affinity links | dagre, then proximity analysis |
| **System Diagrams** | The hardware fact sheet: connection X→Y, value Z. All facts except troubleshooting | `HardwareGraph` + `Diagram[]` (Mermaid) | mermaid.js |

**Affinity mechanic (the interesting idea).** Lay out the idea graph with dagre, measure
geometric distance between every cross-cluster node pair, and treat pairs under a threshold
as *affinity candidates*. Gemma is then asked to state the connection **only** if evidence
supports it; otherwise the pair stays unlinked and becomes a gap question (acceptance check
C17). The "Unify clusters" button therefore does real work instead of toggling a boolean.

**Assumption recorded here:** the Living Map canvas in the prototype shows "System
architecture / Power Architecture + Sensor Bus". Under the definition above that content
belongs to System Diagrams, so the Living Map keeps the Stitch visual vocabulary (stream
column, card styling, connector lines, unify/unclutter controls) but the canvas becomes a
chronology. This is the one place where literal 1:1 fidelity and correct semantics conflict.
The map shows the selected session; project-wide spanning across sessions is a later step.

### 1.2 Fabricated instrumentation numbers are removed

The prototype is full of invented values. Per decision, **any number we cannot compute from
real evidence is deleted**, not recomputed and not left as decoration. The layout survives;
the slot renders an em-dash, an empty state, or nothing.

Removed outright: `CONFIDENCE: 98.4%`, `LATENCY: 420ms`, `PARSER: V10.2.1`, `Graph latency:
12ms`, `Visual OCR Confidence 94.8%`, `Session ID #481`, `-24V cutoff spike`, `Coil draw:
72mA`, `5.02V measured`, `-0.42V peak`, all BOM `unitCost` values, `IMG_0821.RAW`,
`IMG_1042_bench_wiring.heic`, `#b24-gamma`, `commit 8a19f3`, and the hardcoded 24-bar /
23-bar waveform arrays.

Internal contradictions that disappear with them: Timeline claiming `8` sources over 6 items,
Finished Docs claiming `4 verified voice statements` over 2, and four different values for
the same transient (`-24V`, `2.65V`, `-650mV`, `-0.42V`).

Computed for real instead: session duration, evidence counts by kind, grounding percentage,
open/resolved gap counts, BOM verified ratio, node/edge/cluster counts, diagram line counts,
mermaid parse status, artifact byte sizes and hashes.

Measurements (rail voltages, coil resistance, ripple) exist **only** when spoken or typed,
or lifted from a git diff. Photo-based measurement extraction was explicitly declined, so
the oscilloscope card renders only when a `measurement` evidence item exists; otherwise the
slot shows the bench photo.

---

## 2. Architecture

```
shared/schema/        zod schemas + inferred types — one source of truth for both sides
server/
  index.ts            express app, static media, SSE, error handling, MOCK mode
  config.ts           env parsing and validation
  routes/             sessions, capture, live, gaps, artifacts, search
  store/              sessionStore.ts — session dir I/O, append-only helpers, media refs
  pipeline/           ingest → timeline → synthesize → validate (mode-agnostic)
  providers/          elevenlabs.ts, gemini.ts, git.ts, exif.ts
  lib/                mermaidSubset.ts, validators.ts, zip.ts, search.ts
  prompts/*.md        one prompt per artifact
fixtures/session-01/  a complete fake session, byte-identical in shape to a real one
src/
  lib/                api client, react-query hooks, SSE hook, audio worklet, formatters
  components/ui/      toast, page shell, stat tile, citation chip, evidence photo card…
  components/graph/   MermaidDiagram, IdeaGraphCanvas, ChronologyMap, ConnectorLayer
  views/              the nine views, all data-driven
data/sessions/<id>/   runtime state, gitignored
```

**Fixture-first is enforced structurally.** With `MOCK=1` the server serves
`fixtures/session-01/` through the *same* routes and the *same* store code. The frontend
cannot distinguish mock from real, so M1 delivers a genuinely dynamic UI with zero API keys
and M2 swaps the pipeline in behind an unchanged contract.

### 2.1 Session directory layout

```
data/sessions/<id>/
  session.json          mode, status, name, repoPath, timing, computed counts
  capture/
    audio/<n>.<ext>     immutable inputs
    photos/<n>.<ext>
    notes.txt
    keyterms.txt
  raw/
    stt/<audioId>.json  complete provider response, never edited
    live.jsonl          every realtime event, appended before any model call
    git.json            commit snapshots with diffs
  transcript.json       normalized segments + word spans
  evidence.json         the timeline: stable ids, source tags, normalized UTC instants
  chronology.json       Living Map phases + entries
  ideas/
    graph.json          current idea graph
    history.jsonl       append-only graph operations
  hardware/
    graph.json          fact-sheet nodes and edges
    diagrams/*.mmd      canonical Mermaid artifacts
  artifacts/            README.md OBSERVER_NOTES.md BOM.md TROUBLESHOOTING.md GAPS.md
  bom.json gaps.json incidents.json observations.json readme-prose.json runs.jsonl
```

Raw provider output is immutable and written **before** any model work. A Gemma failure
must never lose captured transcript (C14).

### 2.2 HTTP + streaming surface

```
GET    /api/health                       provider key presence (never values), version
GET    /api/sessions                     session library
POST   /api/sessions                     create { name, mode }
GET    /api/sessions/:id                 full hydration bundle for the UI
PATCH  /api/sessions/:id                 rename, set repoPath
DELETE /api/sessions/:id
POST   /api/sessions/:id/capture         multipart: audio[], photos[], notes, keyterms
POST   /api/sessions/:id/process         start or resume a batch run → runId
GET    /api/sessions/:id/events          SSE: run progress + incremental artifacts
POST   /api/sessions/:id/live/token      mint ElevenLabs single-use realtime_scribe token
POST   /api/sessions/:id/live/events     append raw realtime events, then queue synthesis
POST   /api/sessions/:id/live/end        commit and run synthesis over the backlog
POST   /api/sessions/:id/gaps/:gapId     resolve with { answer } or { audio }
GET    /api/sessions/:id/media/*         locally stored photos and audio
GET    /api/sessions/:id/artifacts/:name raw markdown or mmd
GET    /api/sessions/:id/bundle.zip      real archive, streamed
GET    /api/search?q=&sessionId=         real corpus search
```

### 2.3 Environment

```
GEMINI_API_KEY        required for synthesis
ELEVENLABS_API_KEY    required for STT and token minting
GEMMA_MODEL           default gemma-4-26b-a4b-it
DATA_DIR              default ./data
PORT                  server port, default 8787
MOCK                  1 = serve fixtures, no provider calls, no keys needed
```

Keys stay server-side. The browser only ever receives a short-lived single-use token.

---

## 3. Data model

Defined once as zod schemas in `shared/schema/`, inferred to TypeScript types, imported by
the server and the client through the `@shared` alias.

| Entity | Notes |
| --- | --- |
| `Session` | `mode: batch \| live`, `status: draft \| capturing \| processing \| ready \| failed`, timing, `repoPath`, computed counts, grounding summary |
| `EvidenceItem` | `kind: voice \| photo \| commit \| note \| measurement`; `sourceTag` is the canonical citation label; `instant` (ISO UTC) plus `instantIsNaive` for EXIF; kind-specific payloads |
| `TranscriptSegment`, `Word` | provider-normalized, with audio-relative spans |
| `Claim` | `text`, `sources[]`, `status: grounded \| inferred \| unverified` — the unit C1 is checked against |
| `ChronologyPhase`, `ChronologyEntry` | Living Map |
| `IdeaNode`, `IdeaEdge`, `IdeaCluster`, `AffinityLink` | Live Flowchart; `AffinityLink.status: candidate \| confirmed \| rejected \| gap` |
| `HardwareNode`, `HardwareEdge`, `Diagram` | System Diagrams; `Diagram.parseStatus` comes from a real parse |
| `BomItem`, `BenchTool` | `unitCost` optional and only present when sourced; tools are evidence-derived |
| `GapItem` | `targetDoc`, `priority`, `status`, `resolution` carrying its own `evidenceId` when answered by voice, `appliesTo` for write-back |
| `ObservationNote` | third-person; validated against C9/C10 |
| `Incident` | symptom, measurements, root cause, fix, verification, rules learned, related commits |
| `Artifact` | path, kind, status, summary, byte size, hash, generatedAt |
| `RunEvent` | SSE payloads: `stage \| log \| evidence \| artifact \| gap \| graph \| done \| error` |

**Timeline policy (ACTION_PLAN §3, implemented literally):** timezone-aware items sort by
normalized UTC instant; timezone-naive EXIF values remain naive and sort after aware
instants; untimed evidence sorts after dated evidence; ties break by stable source id.
Speech-to-commit association is not attempted in v1.

---

## 4. Frontend rewrite

### 4.1 Foundation

- The ~20 hardcoded hex values move into Tailwind v4 `@theme` tokens (`--color-surface-0:
  #131314`, `--color-surface-1: #161618`, `--color-card: #1c1b1c`, `--color-raised:
  #201f20`, `--color-border: #2a2a2b`, `--color-border-strong: #353436`, `--color-muted:
  #8f9194`, `--color-body: #c5c7c9`, `--color-text: #e5e2e3`, `--color-alert: #ffb4ab`,
  `--color-alert-deep: #93000a`). Rendered output is unchanged; the palette becomes addressable.
- Define the missing `fadeIn` keyframes. `animate-fadeIn` is used 20× and currently compiles
  to nothing.
- Extract the duplicated pieces: `Toast` (copy-pasted in six views, none of which clear their
  timers), `PageShell`, `StatTile`, `SectionHeading`, `CitationChip`, `SourceTag`,
  `EvidencePhotoCard`, `Waveform`, `ScopeTrace`, `CodeDiff`, `DocPane`, `EmptyState`,
  `MetricStrip`.
- TanStack Query for server state, plus an SSE subscription that patches and invalidates on
  run events.
- Loading, empty and error states everywhere. The prototype has none.
- Fix the zero-pad hacks (`0{n}` breaks at ten) with a real `pad2()`, and the
  `verifiedCount / bom.length` division by zero.

### 4.2 Per view

- **Overview** — status tiles, executive summary, deliverable rows, evidence grounding matrix
  and gaps card all bind to the session bundle. `<ScopeTrace>` is driven by real
  `measurement` evidence.
- **Timeline** — real `<audio>` playback of the captured memo, waveform computed from decoded
  PCM peaks, word-level highlighting from Scribe timestamps. Replaces both the synthesized
  sine tone in `utils/audio.ts` and the 24 hardcoded bars frozen at `idx < 9`.
- **Living Map** — chronology canvas; the "stream of thought" column becomes the live note
  feed; photos bind to session media.
- **Live Flowchart** — dagre layout with DOM cards at computed coordinates and a
  `<ConnectorLayer>` measured from real `getBoundingClientRect` anchors. (The prototype draws
  absolute SVG coordinates into a stretched 980×600 viewBox that does not terminate on the
  flexbox cards, and silently misaligns the moment node counts change.) Waveform from a real
  `AnalyserNode` instead of `Math.random()`. Ticker from `partial_transcript`. Sidetrack
  markers persist to the session.
- **System Diagrams** — real mermaid.js. Gemma emits structured hardware and idea graphs;
  the server serializes those sourced nodes/edges into the restricted Mermaid subset, so the
  model determines the graph while a deterministic serializer guarantees valid syntax.
  `lib/mermaid.ts` parses the result back for provenance hover and counts;
  `mermaid.parse()` is the browser's authoritative check behind "Syntax parsed";
  `mermaid.render()` produces a genuine SVG for download. Tuning: `theme: 'base'` with
  `themeVariables` mapped to the palette, `curve: 'basis'`, `htmlLabels: true`, plus a scoped
  CSS layer over `.node rect`, `.edgePath path`, `.cluster rect`, `.edgeLabel` for Space
  Grotesk labels, mono values, `#1c1b1c` fills, `#2a2a2b` strokes, and a `:::hazard` class in
  `#ffb4ab`. Grounding Inspector rows come from real node and edge source tags.
- **BOM & Parts** — table, tools, provenance photos and totals from `bom.json`. Gap
  resolution posts to the API and flows back through the query cache, replacing the
  special-cased `gapId === 'gap-01'` branch in `App.tsx`.
- **Troubleshooting** — `incidents.json` drives the banner, fact row, sequence and bench
  rules; copy and export emit the real generated `TROUBLESHOOTING.md` rather than two
  divergent hardcoded strings.
- **Finished Docs** — tabs render server artifacts through a markdown renderer. The README
  tab is currently a hand-built JSX imitation and the five fallback tabs print wrong
  filenames (`OBSERVER.MD`, `TROUBLESHOOT.MD`). One artifact source, no duplicate copies.
- **Search / Export** — `Cmd+K` hits `/api/search` over evidence, notes, BOM rows, gaps and
  artifacts, with the missing `↵ to view` handler implemented. Export streams a real `.zip`.
- **New screens with no Stitch reference** — session library and session-create/onboarding,
  designed in the same editorial vocabulary.

### 4.3 Dependency changes

Add: `zod`, `@tanstack/react-query`, `mermaid`, `@dagrejs/dagre`, `archiver`, `multer`,
`exifr`, `nanoid`, `react-markdown`, `remark-gfm`; dev: `concurrently`, `vitest`,
`@types/multer`, `@types/archiver`, `@types/dagre`.

Remove: `lucide-react` and `motion` (declared, imported by zero files).

`@google/genai`, `express` and `dotenv` are server-only and must never reach the client
bundle.

---

## 5. Pipeline

### 5.1 Batch (M2)

1. Capture directory (`audio/`, `photos/`, optional `notes.txt`, `keyterms.txt`) plus a path
   to the project's git repository.
2. ElevenLabs Scribe v2 batch — `POST /v1/speech-to-text`, `model_id=scribe_v2`,
   `timestamps_granularity=word`, `keyterms` as repeated form fields. The complete response
   is saved to `raw/stt/` before normalization.
3. EXIF timestamps via `exifr`; git commits and diffs via `git log --numstat` scoped to the
   session window.
4. Deterministic time-sorted timeline with stable ids and source tags.
5. One Gemma call per artifact, prompts in `server/prompts/`, at most 8 photos per call,
   5 MiB each, 20 MiB total inline.
6. Validators run on every output. Retry once on invalid; if still invalid, omit the artifact
   and file a gap question. Never save malformed Mermaid or unsupported claims.

### 5.2 Live (M3)

1. `POST /live/token` mints an ElevenLabs single-use token of type `realtime_scribe`
   (`POST /v1/single-use-token/realtime_scribe`, 15-minute expiry, consumed on use → re-mint
   on reconnect). The long-lived key never leaves the server.
2. Browser captures the microphone through an AudioWorklet, resamples to 16 kHz mono PCM,
   and sends `input_audio_chunk` messages to
   `wss://api.elevenlabs.io/v1/speech-to-text/realtime`.
3. `partial_transcript` events drive the UI ticker and are treated as mutable.
   `committed_transcript` events are canonical, forwarded to the server, appended to
   `raw/live.jsonl` **before** any model work, then synthesized incrementally.
4. Graph operations append to `ideas/history.jsonl`; current state is recomputed, never
   mutated in place. Spoken corrections update current state while retaining history (C15).
5. Clusters render as Mermaid subgraphs. The unify step runs only after graph schemas and
   provenance rules are fixed.

### 5.3 Validation — acceptance checks become code

| Check | Enforcement |
| --- | --- |
| C1 every claim has a source | `validators.ts` rejects any `Claim` with empty `sources` |
| C2 a planted false detail is not stated as fact | fixture test |
| C3 a missing fact becomes a gap question | synthesis emits a gap when a required field is unsourced |
| C5 speech/commit time association | timeline policy test |
| C7 diagram elements are source-backed; removing evidence removes the element | graph rebuild test |
| C8 every saved `.mmd` parses | `mermaidSubset.parse` + `mermaid.parse()` gate before write |
| C9 observer notes contain no first-person whole words | regex over `\b(I|we|my|our)\b` |
| C10 observer notes invent no motives or feelings | prompt contract + review fixture |
| C11–C18 live graph ops | op validator: known node ids, valid enum, grounded in chunk or existing state |

Tests are fixture-backed by default and never call billed APIs. Live smoke tests are marked
and run only under `LIVE=1`.

---

## 6. Milestones

**M0 — Foundation.** `git init` with `.gitignore` written before any `git add`; the two exact
ACTION_PLAN §5 commit messages; explicit staging with inspected diffs. Package restructure,
split tsconfigs with `strict: true` (currently absent), `.env.example`, theme tokens,
`fadeIn` keyframes, dependency changes. Exit: `npm install`, `npm run lint` and
`npm run build` all pass.

**M1 — Dynamic UI on fixtures.** Shared schemas, session store, mock-mode server, fixture
session, extracted primitives, all nine views and three modals data-driven, session library
and picker, loading/empty/error states, mermaid rendering, dagre idea graph, chronology
canvas. Exit: no hardcoded content literal remains in `src/views/`; deleting the fixture
breaks every view instead of silently showing fake data.

**M2 — Batch pipeline with real providers.** Ingest, timeline, Gemma synthesis, validators,
artifacts on disk, real zip/CSV/SVG exports, real search. Exit: C1–C10 pass on fixtures and
one real capture directory produces sourced documentation end to end.

**M3 — Live mode.** Token minting, AudioWorklet capture, raw-event durability, incremental
synthesis, idea-graph operations and history, affinity and unify, live UI wiring. Exit:
C11–C18 pass and killing Gemini mid-session loses no transcript.

**M4 — Polish.** Remaining work: cross-session Living Map and further visual/accessibility
polish. Mermaid theming, spoken gap answers and curated provider notes are implemented.

---

## 7. Risks

1. **The scaffold has never been installed.** TypeScript `^7.0.2` (the native compiler),
   Vite 8, React 19, `express` in `dependencies` next to a `clean` script that deletes a
   `server.js` which does not exist. M0 verifies the install and pins back to TypeScript 5.x
   if the native compiler rejects the project's options.
2. **Gemma honoring the output contract is unverified** — `docs/references/` explicitly does
   not assume structured output for this model. Mitigation is the documented one: validators,
   one retry, omit-and-gap. M2 opens with a small smoke test before the full pipeline.
3. **All fixture images are remote `lh3.googleusercontent.com` URLs** that will rot. Real
   sessions store uploads locally; fixtures keep the URLs until they die.
4. **Removing fabricated numbers leaves visible holes.** Some cards look emptier until real
   evidence fills them. That is the honest consequence of the decision, not a regression.
5. **Realtime cost, keyterm surcharges and browser token semantics are unverified.** Smoke
   tests stay tiny and out of the default suite.
6. **No git history exists.** M0 starts from scratch; the prototype has no prior commits to
   preserve.
