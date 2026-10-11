# Devlog

**Talk through your build. Keep the evidence.** Devlog turns voice, bench photos, notes and Git history into source-backed hardware documentation.

The local web app has a session library and nine workspace views. They render three separate models from one evidence store:

- **Living Map** — the chronological build log across each selected session.
- **Live Flowchart** — evolving ideas and sourced cross-cluster connections.
- **System Diagrams** — the hardware fact sheet: components, connections and measured values.

The other views cover the evidence timeline, observer notes and gaps, BOM, troubleshooting, overview and finished documents. Every generated claim keeps evidence references; unknown specifications become questions rather than invented values.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
# Create the local config only if you don't already have one (preserves existing keys).
test -f .env || cp .env.example .env
# Google Cloud ADC is auto-detected for Gemma. Put ELEVENLABS_API_KEY in ignored .env for audio/live capture.
# If ADC is not configured yet: gcloud auth application-default login
npm run dev
```

Open <http://localhost:3000>. The Vite frontend proxies `/api` to the local Express server on port 8787. The server binds locally by default unless configured otherwise.

With neither Google auth nor an ElevenLabs key, Devlog runs in mock mode and opens the included ESP32 relay fixture. It exercises the real session API, artifacts, diagrams, gap write-back and exports without provider calls. `MOCK=1` forces this mode. Documentation synthesis uses Gemma through Vertex ADC by default on this setup (or AI Studio with `GEMINI_API_KEY`). Recorded audio and live transcription need ElevenLabs; typed notes, photos, and Git evidence can be synthesized with Gemma alone. The app never sends long-lived credentials to the browser.

### First real session

1. Open <http://localhost:3000> and create a **Recorded session**.
2. Add a short voice recording, optional bench photos/notes/keyterms, and optionally a repository path.
3. Choose **Upload and synthesize**. Scribe transcribes audio; Gemma turns the transcript and other evidence into documentation and graphs.
4. If you only have notes, photos, or Git history, skip audio; Gemma can still synthesize those inputs without an ElevenLabs key.

For live capture, create a **Live bench session**, choose **Add evidence → Prepare live session**, then allow microphone access and start capture.

### Environment

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Optional AI Studio auth. Alternatively, use Vertex ADC from `gcloud auth application-default login` |
| `GOOGLE_CLOUD_PROJECT` | Optional Vertex project override; otherwise read from ADC quota project |
| `GOOGLE_CLOUD_LOCATION` | Vertex location; defaults to `global` for Gemma MaaS |
| `ELEVENLABS_API_KEY` | Scribe v2 batch transcription and minting single-use realtime tokens |
| `GEMMA_MODEL` | Optional model override; defaults to `gemma-4-26b-a4b-it-maas` on Vertex ADC |
| `DATA_DIR` | Session data directory; default `./data` (gitignored) |
| `PORT` | Express API port; default `8787` |
| `MOCK` | Set `1` to serve fixtures and skip provider requests |

## Using the workspace

1. Create a **recorded** session or a **live** bench session.
2. Recorded mode accepts audio, photos, optional notes/keyterms, and a path to a local Git repository. Press **Upload and synthesize** to build the timeline and documentation.
3. Live mode requests microphone permission, streams 16 kHz mono PCM to Scribe v2 Realtime using a server-minted single-use token, and appends every provider event to the session before processing committed transcripts.
4. Review unresolved details in **Observations**. Resolve a gap by typing or recording a spoken answer; spoken answers are transcribed by Scribe and stored as new evidence. The answer updates the affected structured row and regenerates the artifacts.
5. Download the bundle from **Export**. Generated files remain in the local session data directory and are never written into the hardware repository automatically.

## Storage and outputs

Each session is stored under `DATA_DIR/sessions/<id>/`. Captures, raw Scribe responses/events, normalized transcript, evidence, graphs, gaps, incidents and generated artifacts are kept together. Raw live events are append-only. Generated docs are in the session's `artifacts/` directory, including `README.md`, `BOM.md`, `OBSERVER_NOTES.md`, `TROUBLESHOOTING.md`, `GAPS.md`, and Mermaid diagrams.

## Development and checks

```bash
npm run lint       # strict TypeScript for browser, server and shared schemas
npm test           # fixture-backed timeline and Mermaid contract tests
npm run build      # typecheck and production Vite build
npm run fixture    # regenerate fixtures/session-01 from its source builder
```

Normal tests do not call paid APIs. The ADC/Gemma text-and-image path, Scribe batch transcription, and a Realtime Scribe WebSocket clip have been smoke-tested. Browser microphone permission/capture, real bench recordings, account quotas, and billing still need to be checked in your environment. Provider details are recorded under [`docs/references/`](docs/references/README.md).

## Privacy and trust

- Provider API keys stay in the local server process. The browser receives only a short-lived Scribe token for live transcription.
- Session captures, transcripts, provider responses, generated output and `.env` are gitignored by default. The prepared fixture is tracked.
- The Gemini provider forwards selected session evidence and supported images to Google. ElevenLabs receives audio sent for transcription. Review provider terms and the session data before processing private captures.
- Measurements are only reported when present in spoken or typed evidence or Git data; photos are not used to invent numeric readings.
- The model's source references are resolved against real evidence ids. Diagram syntax is validated before writing; unknown citations and unsupported graph elements are dropped.

## License

MIT. See [`LICENSE`](LICENSE).
