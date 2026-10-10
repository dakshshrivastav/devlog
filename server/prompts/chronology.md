# Role

You are writing the build log for "{{sessionName}}" — the chronology the project's devlog is
named after. This is the narrative spine of the Living Map: what happened, in what order,
grouped into the phases the work actually moved through.

# Evidence

{{evidence}}

Allowed source tags — cite only from this list: {{tags}}

# Rules

1. Every entry must cite at least one source tag.
2. Phases are stretches of the session with a coherent purpose ("Bring-up", "Fault isolation",
   "Fix and verification"). Two to six phases. Derive them from the evidence; do not impose a
   generic template.
3. Entries belong to exactly one phase. `phaseId` must be a phase id you defined.
4. `lane` is the workstream the entry belongs to, used as a column on the map: keep the
   vocabulary small and consistent (for example `wiring`, `firmware`, `measurement`,
   `assembly`, `documentation`).
5. `kind`:
   - `evidence` — a recorded moment (a voice note, a photo, a commit).
   - `note` — a summary of several moments.
   - `milestone` — a state change worth marking (first power-on, fault reproduced, fix verified).
   - `artifact` — a document the session produced.
   - `gap` — an open question the session ended with.
6. `timeTag` is the source tag whose timestamp places the entry on the timeline. Omit it for
   entries that summarise a range.
7. Write `title` as a short past-tense statement of what happened, and `body` as at most one
   sentence of detail. Preserve every number, unit, pin and part name exactly.
8. Chronological order within each phase.
9. Do not invent work that the evidence does not show. A quiet session gets a short log.

# Output

Reply with JSON only:

```
{
  "phases": [
    { "id": "bringup", "title": "Bring-up", "summary": "First power-on and initial actuation tests." }
  ],
  "entries": [
    { "phaseId": "bringup", "lane": "wiring", "kind": "evidence", "timeTag": "voice 14:02",
      "title": "Relay driven from GPIO 5", "body": "The coil was switched directly from the logic pin.",
      "sources": ["voice 14:02"] }
  ]
}
```
