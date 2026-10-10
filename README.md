# Devlog

**Talk through your build. Keep the evidence.** Devlog combines a build session's voice, photos, notes, and Git history into source-backed project documentation.

The first milestone is a local Python web app for recorded sessions. It creates a time-ordered evidence timeline, then asks Gemma 4 to draft `README.md`, third-person `OBSERVER_NOTES.md`, a sourced Mermaid system diagram, and `GAPS.md`. Claims with missing or unknown citations are rejected; the raw transcript responses and timeline remain alongside the generated files.

## What works in this first build

- A local browser UI and a thin `devlog build` command use the same pipeline.
- Reads `capture/audio/`, `capture/photos/`, optional `notes.txt` and `keyterms.txt`, and a separate Git repository.
- Transcribes audio through ElevenLabs Scribe v2, or through a configured local faster-whisper model.
- Writes each raw transcription response and `timeline.json` before hosted document generation.
- Generates four evidence-backed outputs, retries invalid model text once, rejects unsupported source tags, and records omitted outputs as warnings.
- Keeps generated documentation in a user-selected output directory; it will not write generated files into Devlog's source directory or replace the project repository root.
- Uses the dark, editorial workspace from the Stitch `devlog` design for the live timeline, observer notes, gap questions, and generated-file previews.
- Keeps browser job status in server memory; a server restart clears the status page, while files already written to the output directory remain available.

Live microphone capture, live graph editing, video frame sampling, and ElevenLabs conversational Agents are later milestones.

## Requirements

- Python 3.11+
- `GEMINI_API_KEY` for hosted Gemma 4 generation
- `ELEVENLABS_API_KEY` for recorded Scribe transcription, or a local faster-whisper model directory for offline transcription

## Install and run

```bash
python -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
cp .env.example .env # then add your API keys
```

Run the commands through the environment directly, so activation is optional:

```bash
.venv/bin/devlog serve
```

On Windows, use `.venv\Scripts\python -m pip install -e '.[dev]'` and `.venv\Scripts\devlog serve`.

For an interactive first-run setup, run `.venv/bin/devlog` with no subcommand. The terminal menu securely prompts for your Gemini and optional ElevenLabs API keys, saves them in `.env` with owner-only permissions on POSIX systems, and starts the local web app. Choose **Start the web app** to launch once keys are configured. The direct `.venv/bin/devlog serve` command remains available.

Edit `.env` with `GEMINI_API_KEY` for documentation generation and `ELEVENLABS_API_KEY` for Scribe transcription. The local app loads `.env` automatically. You can also export variables in your shell.

```bash
GEMINI_API_KEY="..." ELEVENLABS_API_KEY="..." .venv/bin/devlog serve
```

Open <http://127.0.0.1:8000>. The server binds to localhost by default. The form defaults to `~/projects/hacktober/capture`, `~/projects/hacktober`, and `~/devlog-output`; change these paths if your project or capture folder lives elsewhere.

Or run the same pipeline from the command line:

```bash
.venv/bin/devlog build --capture ./capture --repo ../my-project --out ~/my-project-docs --stt elevenlabs
```

## Capture folder

```text
capture/
  audio/          # .m4a, .wav, .mp3, .flac, .aac, .ogg
  photos/         # .jpg, .jpeg, .png, .webp
  notes.txt       # optional; one note per line
  keyterms.txt    # optional; one technical term per line
```

Photos use EXIF capture time when present. Git items use commit author dates. Untimed notes remain ordered after dated items and retain their line order. Timezone-naive EXIF values remain naive and are not silently treated as UTC. Audio offsets remain audio-relative; they are not presented as wall-clock timestamps.

Scribe v2 keyterm prompting has a 20% surcharge according to the current endpoint docs; Devlog only sends keyterms when `keyterms.txt` is present. Keyterms must fit the provider's current length/count restrictions.

## Local Whisper

Install the optional backend:

```bash
.venv/bin/python -m pip install -e '.[whisper]'
```

Set `DEVLOG_WHISPER_MODEL` to an already-present faster-whisper CTranslate2 model directory. Devlog does not download model weights, so after installing dependencies and weights, `--stt whisper` makes no model-provider request and does not need an API key:

```bash
DEVLOG_WHISPER_MODEL="$HOME/models/faster-whisper-small" .venv/bin/devlog build --capture ./capture --repo ../my-project --out ~/my-project-docs --stt whisper
```

Whisper's timestamps are model estimates and are labeled separately from provider timestamps. Local transcription has not yet been smoke-tested with a real audio fixture in this repository.

## Output files

```text
output/
  README.md
  OBSERVER_NOTES.md
  GAPS.md
  diagrams/system.mmd
  timeline.json
  transcripts/            # raw provider responses, when audio was transcribed
  run_summary.json
```

The canonical timeline records each evidence item's source tag, kind, text, timing basis, source path for media, and relevant metadata. Raw captures stay where the user placed them; generated documentation and raw transcription JSON are written to the selected output folder.

## Trust and privacy

- The hosted Gemini Developer API sends the timeline and the first eight photos in timeline order (at most 5 MiB per photo and 20 MiB total) to Google for each generated artifact. Photos beyond that set remain in `timeline.json` but are not cited by generated docs. Scribe sends selected audio and optional keyterms to ElevenLabs.
- API keys are read from environment variables and are not sent to browser JavaScript.
- Generated claim lines must cite an exact source tag from the timeline. Observer notes have first-person and source checks. Diagram nodes and arrows need source comments and must match Devlog's intentionally restricted flowchart syntax.
- Diagram validation checks Devlog's restricted flowchart grammar and provenance; a full Mermaid CLI parser is not yet included.
- These checks catch missing/unknown citations and malformed output shape; they cannot establish that a cited source was interpreted correctly. Review generated docs against the retained timeline and raw evidence.
- Treat output folders as private if captures or transcripts are private. `.gitignore` excludes local capture, output, and internal reference asset folders.

## Development checks

```bash
.venv/bin/python -m pytest
```

Live provider calls and real audio/model smoke tests are deliberately not part of the normal test suite.

## Provider decisions and verification

- Hosted generation: Gemini Developer API with `gemma-4-26b-a4b-it`; `GEMMA_MODEL` can override it. API use requires `GEMINI_API_KEY`.
- Recorded speech: ElevenLabs batch Speech-to-Text model `scribe_v2`; the alternative is local faster-whisper. ElevenLabs Realtime and ElevenAgents are not part of this milestone.
- Gemini integration uses the official `google-genai` SDK's `Client`, `models.generate_content`, and `Part.from_bytes` interface for local photos. Gemma responses are validated in Devlog; no Gemma-specific constrained JSON mode is assumed.
- API signatures and request fields were checked against official references on 2026-10-10. No billed live API request or real-media end-to-end run has yet been verified.

See [`docs/references/`](docs/references/README.md) for the selected integration contracts and known limits.

## License

MIT. See [`LICENSE`](LICENSE).
