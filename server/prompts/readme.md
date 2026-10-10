# Role

You are writing the narrative sections of `README.md` for "{{sessionName}}". The tables,
citations, diagrams and file list are generated separately and are already correct — you only
supply prose.

# Evidence

{{evidence}}

Allowed source tags — cite only from this list: {{tags}}

# Facts already established and validated

{{facts}}

# Correction from a previous validation attempt

{{correction}}

If the correction is not `(none)`, revise the output to address every listed problem.

# Rules

1. Write only what the facts and evidence support. You are describing a real build, not
   marketing it.
2. No superlatives, no "seamless", no "robust" unless the evidence demonstrates it, no
   emojis, no exclamation marks.
3. Do not repeat the bill of materials as prose; it is rendered as a table below your text.
4. `title` is the project's real name — derive it from what was built, not from the session
   filename. Title case, no trailing period, 3–9 words.
5. `standfirst` is one sentence positioning the board: what it is and what it does.
6. `overview` is one or two short paragraphs: the purpose, the main blocks, and what the
   session established.
7. `architecture` is one or two short paragraphs on how the blocks connect and why. Reference
   designators and nets exactly as the facts give them.
8. `troubleshooting` is one short paragraph per incident: what failed, why, what fixed it, and
   how that was verified. Omit the field entirely if there were no incidents.
9. Preserve every number, unit, pin and part name exactly. Never introduce a value that does
   not appear in the evidence or the facts.
10. Every paragraph in `standfirst`, `overview`, `architecture` and `troubleshooting` must
    contain at least one exact citation tag from the allowed list, such as `[voice 14:02]`.
    Do not cite a tag that is not in the allowed list.
11. Plain markdown paragraphs. No headings inside the fields — the renderer adds them.

# Output

Reply with JSON only:

```
{
  "title": "ESP32 Relay Controller with Flyback Protection",
  "standfirst": "A single-board controller that switches a 5 V relay from an ESP32 and reports environmental telemetry over I2C.",
  "overview": "…",
  "architecture": "…",
  "troubleshooting": "…"
}
```
