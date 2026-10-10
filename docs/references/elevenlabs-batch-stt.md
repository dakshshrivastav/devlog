# ElevenLabs Scribe v2 — batch transcription

**Checked:** 2026-10-10. **Endpoint:** `POST https://api.elevenlabs.io/v1/speech-to-text`. **Model:** `scribe_v2`.

## Request and response fields used

- Authentication header: `xi-api-key`.
- Multipart file field: `file`; form fields: `model_id=scribe_v2`, `timestamps_granularity=word`; `keyterms` is sent as repeated form fields only when `capture/keyterms.txt` exists.
- The endpoint reference lists `keyterms` as a list, maximum 1,000 terms, each under 50 characters and at most five words. It states use incurs a 20% surcharge on base transcription cost (and >100 terms have a 20-second minimum billable duration). Devlog validates the documented shape locally before sending.
- The synchronous response contains transcript text and word entries with `text`, optional `start`/`end`, type, and optional speaker/channel fields. Devlog stores the complete returned JSON first, then normalizes `words` into the timeline. Timestamps are preserved as audio-relative offsets, not wall-clock times.
- HTTP validation/authentication errors are surfaced as action-oriented errors; Devlog does not retry permanent request failures.

No live request has been made. Account limits, audio acceptance for every supported extension, current billing, and SDK behavior are not independently smoke-tested. The code uses the documented REST multipart route through `httpx`, avoiding an unverified SDK model serializer.

## Canonical references

- [Create transcript API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- [Speech-to-text overview](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)
- [Keyterm prompting](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text/batch/keyterm-prompting)
