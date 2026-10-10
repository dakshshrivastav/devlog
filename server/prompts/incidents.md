# Role

You are writing the troubleshooting log for "{{sessionName}}": each anomaly observed on the
bench, its root cause, the fix applied, and how the fix was verified.

# Evidence

{{evidence}}

# Observer notes already extracted

{{observations}}

Allowed source tags — cite only from this list: {{tags}}

# Rules

1. One incident per distinct fault. Do not split a single fault into several entries, and do
   not merge two unrelated faults.
2. Every incident must cite at least one source tag. Its measurements and its bench rules
   each carry their own citations.
3. `rootCause` must be the physical or logical mechanism the evidence supports. If the
   evidence shows a symptom but never establishes a mechanism, say so plainly in `rootCause`
   ("mechanism not established in this session") and set `status` to `"open"`. Never supply
   a textbook explanation the builder did not demonstrate.
4. `fix` only when the evidence shows something was actually changed. An attempted fix that
   did not work belongs in `symptom` or `verification`, not in `fix`.
5. `verification` only when the evidence reports a check after the fix. Quote the stated
   result.
6. `level`: hardware, firmware, wiring or environmental.
7. `status`: `"resolved"` only when a verification exists; otherwise `"open"`.
8. `detectedTag` and `resolvedTag` are source tags, not free text.
9. `relatedCommitTags` are source tags of commits that touched this fault.
10. `rulesLearned` are durable bench rules the incident establishes — the kind of thing worth
    writing on the wall. Each needs its own citation. Do not invent general advice.
11. Preserve every number and unit exactly as stated.

# Output

Reply with JSON only:

```
{
  "incidents": [
    {
      "title": "Intermittent brownout reset on relay actuation",
      "level": "hardware",
      "status": "resolved",
      "phase": "Actuation testing",
      "detectedTag": "voice 14:02",
      "resolvedTag": "voice 14:14",
      "telemetryTarget": "3.3V logic rail",
      "symptom": "The controller reset each time the relay coil was de-energized.",
      "measurements": [
        { "label": "3.3V rail minimum during switching", "value": "2.65 V", "sources": ["voice 14:14"] }
      ],
      "rootCause": "Unsuppressed inductive kickback from the coil pulled the shared 3.3V rail below the brownout threshold.",
      "fix": "Flyback diode fitted antiparallel across the coil terminals.",
      "verification": "Rail held steady across repeated actuations after the diode was fitted.",
      "rulesLearned": [
        { "title": "Clamp every inductive load", "body": "A coil driven from a logic rail needs an antiparallel diode before the first actuation test.", "sources": ["voice 14:12"] }
      ],
      "relatedCommitTags": ["commit c4e12a"],
      "sources": ["voice 14:02", "photo 1", "voice 14:14"]
    }
  ]
}
```

If the session recorded no anomaly, reply `{"incidents": []}`.
