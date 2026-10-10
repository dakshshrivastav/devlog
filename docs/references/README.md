# Provider references

Checked on **2026-10-10**. These are implementation notes, not guarantees of account access, quotas, costs, or successful live calls. Re-check the official API before changing providers or request fields.

- [Gemma 4 on the Gemini Developer API](gemma4-gemini-api.md)
- [ElevenLabs Scribe v2 batch transcription](elevenlabs-batch-stt.md)
- [Local faster-whisper fallback](whisper-local.md)

## Selected v1 integration

Devlog uses the Gemini Developer API (not Google Cloud MaaS) and its hosted `gemma-4-26b-a4b-it` model. Recorded speech uses Scribe v2 or the local faster-whisper adapter. These are separate provider boundaries. Realtime Scribe, ElevenAgents, TTS, and Cloud MaaS are not wired into this milestone.

## Verification boundary

Documentation and SDK interfaces were inspected on 2026-10-10. Normal tests use synthetic data and do not consume API credits. Account authorization, model availability, billing, quotas, request limits, live image handling, and generated-output quality still require a separately configured live smoke test.
