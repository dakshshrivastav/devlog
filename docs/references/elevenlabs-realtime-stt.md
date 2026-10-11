# ElevenLabs Scribe v2 Realtime — browser microphone path

Checked **2026-10-11** against the official WebSocket reference and client-side streaming guide. A live smoke test minted a token and received a committed transcript from a short synthetic PCM clip. The browser microphone UI itself has not yet been smoke-tested.

## Connection

- Endpoint: `wss://api.elevenlabs.io/v1/speech-to-text/realtime`
- Model: `scribe_v2_realtime`
- Browser authentication: a server-minted, single-use `realtime_scribe` token in the `token` query parameter. Never send `ELEVENLABS_API_KEY` to client code.
- Devlog requests `audio_format=pcm_16000`, `commit_strategy=vad`, `include_timestamps=true`, and `keepalive_interval_ms=5000`.
- PCM chunks use mono signed 16-bit samples at 16 kHz, base64 encoded in `input_audio_chunk` JSON messages with `sample_rate: 16000`.
- The server accepts at most 50 realtime keyterms; batch limits are different. Devlog validates and caps the term list separately.

## Event handling

Provider events include `session_started`, `partial_transcript`, `committed_transcript`, `committed_transcript_with_timestamps`, warnings, and typed errors. Partials can change; only committed results become canonical transcript segments. When timestamp events are enabled, word entries include `text`, `start`, `end`, and `type`.

Devlog appends every received event — including partials — to `raw/live.jsonl` before interpreting it. Only committed transcript events become evidence. Each resulting evidence item points to its transcript segment, and live graph operations carry the committed chunk id. If the API write temporarily fails, the browser keeps a session-scoped pending event queue and retries before closing the session.

Reconnects mint a new one-use token. The browser logs close codes/reasons and applies bounded exponential retry; transcript persistence is independent of Gemini synthesis.

## Canonical references

- [Realtime speech-to-text WebSocket reference](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- [Client-side streaming guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming)
- [Create a single-use token](https://elevenlabs.io/docs/api-reference/tokens/create)
