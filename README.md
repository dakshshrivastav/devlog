# Devlog

**Talk through your build. Keep the evidence.** Devlog turns voice, bench photos, notes and Git history into source-backed hardware documentation.

demo - https://drive.google.com/file/d/1U5PuZf0vizUwSaiSZ1w_ml44onEIjE40/view?usp=sharing

The local web app has a session library and nine workspace views. They render three separate models from one evidence store:

- **Living Map** — the chronological build log across each selected session.
- **Live Flowchart** — evolving ideas and sourced cross-cluster connections.
- **System Diagrams** — the hardware fact sheet: components, connections and measured values.

The other views cover the evidence timeline, observer notes and gaps, BOM, troubleshooting, overview and finished documents. Every generated claim keeps evidence references; unknown specifications become questions rather than invented values.

## Run locally

Requires Node.js 22 or newer. Video processing additionally requires `ffmpeg` and `ffprobe` on `PATH`.

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

## Temporary Google Cloud Run deployment

The included `Dockerfile` builds a temporary-profile container for Cloud Run. The current public deployment is [devlog](https://devlog-805110037945.us-central1.run.app). The profile stores sessions in `/tmp/devlog`, disables video uploads and limits each capture request to 30 MiB. Audio, photos, notes, live transcripts, and synthesis remain available. The local repository-path input is hidden because a Cloud Run container cannot read files from your computer.

The service is publicly accessible and Devlog has no in-app login. Anyone with the URL can access the workspace and trigger provider-backed actions that may incur API charges. Do not enter private session data.

This is intentionally a **single-instance demo**, not durable hosting. Cloud Run's writable filesystem belongs to the running instance and is lost when that instance stops or is replaced. The deploy command mounts a size-limited 1 GiB in-memory volume for session data, so stored captures and generated artifacts also consume instance memory. A single maximum instance plus session affinity keeps normal requests on one instance, but neither prevents restarts nor makes the filesystem durable. Keep copies of anything important by exporting the session bundle. Set `min-instances` to `1` and enable always-allocated CPU so detached synthesis can continue after the request returns; this incurs ongoing instance charges. An instance can still be restarted or run out of memory, so in-progress work and session history can disappear.

### Deploy publicly

Install and authenticate the Google Cloud CLI, select a project with billing enabled, and enable the required APIs:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com secretmanager.googleapis.com --project PROJECT_ID
```

Create a runtime service account and grant it Vertex AI access (needed when using ADC for Gemma):

```bash
gcloud iam service-accounts create devlog-runtime --project PROJECT_ID
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:devlog-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

Create a Secret Manager secret for `ELEVENLABS_API_KEY` and grant the runtime service account `roles/secretmanager.secretAccessor` on that secret. For Gemini Developer API instead of Vertex ADC, create a `GEMINI_API_KEY` secret too. Do not put provider keys in the Docker image or pass them as plain environment variables.

From the project directory, deploy one public instance. Replace the region and project values, and use the `--set-secrets` entry for the secret(s) you created:

```bash
gcloud run deploy devlog \
  --source . \
  --project PROJECT_ID \
  --region us-central1 \
  --service-account devlog-runtime@PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --min 1 --max 1 --memory 2Gi --cpu 2 --timeout 900 \
  --session-affinity --no-cpu-throttling \
  --add-volume name=devlog-data,type=in-memory,size-limit=1Gi \
  --add-volume-mount volume=devlog-data,mount-path=/tmp/devlog \
  --set-env-vars GOOGLE_CLOUD_PROJECT=PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,DATA_DIR=/tmp/devlog \
  --set-secrets ELEVENLABS_API_KEY=elevenlabs-api-key:latest
```

For Gemini Developer API, add `GEMINI_API_KEY=gemini-api-key:latest` to `--set-secrets`; this takes precedence over Vertex ADC. Open the service URL printed by `gcloud run deploy` to use the public app.

`--min 1` with `--no-cpu-throttling` keeps CPU available for background processing but is billed while the instance is provisioned. Setting a minimum of zero can reduce idle charges, but Cloud Run may stop an instance after a request and interrupt detached work. Regardless of scaling settings, filesystem data is temporary; Cloud Run is not a persistent session store.

### First real session

1. Open <http://localhost:3000> and create a **Recorded session**.
2. Add a short voice recording, video walkthrough, optional bench photos/notes/keyterms, and optionally a repository path.
3. Choose **Upload and synthesize**. Video audio is extracted for Scribe, and up to four timestamped frames are sampled for Gemma. Gemma combines the transcript and other evidence into documentation and graphs.
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
| `MAX_VIDEO_FRAMES` | Maximum video frames sampled for Gemma per session; default `4` |
| `DATA_DIR` | Session data directory; default `./data` (gitignored) |
| `PORT` | Express API port; default `8787` |
| `MOCK` | Set `1` to serve fixtures and skip provider requests |
| `CLOUD_RUN_EPHEMERAL` | Enables the temporary profile: disables videos and sets a 30 MiB capture-request limit |
| `MAX_CAPTURE_REQUEST_BYTES` | Optional lower limit for the temporary profile's capture requests (capped at 30 MiB) |

## Using the workspace

1. Create a **recorded** session or a **live** bench session.
2. Recorded mode accepts audio, video clips, photos, optional notes/keyterms, and a path to a local Git repository. For video clips, Devlog extracts the audio track for Scribe and samples up to four timestamped frames for Gemma.
3. Press **Upload and synthesize** to build the timeline and documentation.
4. Live mode requests microphone permission, streams 16 kHz mono PCM to Scribe v2 Realtime using a server-minted single-use token, and appends every provider event to the session before processing committed transcripts.
5. Review unresolved details in **Observations**. Resolve a gap by typing or recording a spoken answer; spoken answers are transcribed by Scribe and stored as new evidence. The answer updates the affected structured row and regenerates the artifacts.
6. Download the bundle from **Export**. Generated files remain in the local session data directory and are never written into the hardware repository automatically.

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
- The Gemini provider forwards selected session evidence, supported photos, and sampled video frames to Google. ElevenLabs receives audio sent for transcription, including extracted video audio. Review provider terms and session data before processing private captures.
- Measurements are only reported when present in spoken or typed evidence or Git data; photos are not used to invent numeric readings.
- The model's source references are resolved against real evidence ids. Diagram syntax is validated before writing; unknown citations and unsupported graph elements are dropped.

## License

MIT. See [`LICENSE`](LICENSE).
