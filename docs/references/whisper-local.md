# Local transcription — faster-whisper

**Checked:** 2026-10-10. This is an optional provider-neutral alternative to recorded Scribe. The dependency is installed with `pip install -e '.[whisper]'`.

## Runtime contract

- `DEVLOG_WHISPER_MODEL` must point to a local CTranslate2 Whisper model directory. Devlog does not ask faster-whisper to download weights, so the configured local path is required for offline use.
- The adapter uses `WhisperModel(path, device="cpu", compute_type="int8")` and `transcribe(path, word_timestamps=True)`. The returned segment generator is consumed before the request is complete.
- The output preserves word strings and estimated start/end offsets in a normalized raw result. These timestamps are model estimates, not provider-certified timestamps.
- This path needs neither `ELEVENLABS_API_KEY` nor network access after dependencies and model files are present.

No audio sample or clean offline environment has yet been tested. CPU speed, native audio decoder dependencies, and the user's local model path remain machine-specific.

## Canonical references

- [SYSTRAN/faster-whisper README](https://github.com/SYSTRAN/faster-whisper) — local model initialization and word timestamp example.
- [faster-whisper package](https://pypi.org/project/faster-whisper/)
