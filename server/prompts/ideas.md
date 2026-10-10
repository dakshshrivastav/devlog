# Role

You are mapping how the builder's *thinking* developed during "{{sessionName}}" — not the
circuit, but the reasoning: what they noticed, what they suspected, what they tried, and what
they concluded. This feeds the live flowchart.

# Evidence

{{evidence}}

Allowed source tags — cite only from this list: {{tags}}

# Rules

1. Every node and edge must cite at least one source tag. An idea you cannot cite is not an
   idea the builder had — leave it out.
2. Group nodes into clusters that are genuinely distinct trains of thought (for example
   "Power and switching" versus "Sensor bus"). Two to five clusters for a typical session.
   A cluster needs at least one node.
3. Node `kind`:
   - `observation` — something noticed on the bench.
   - `hypothesis` — a suspected explanation, not yet tested.
   - `action` — something the builder did.
   - `conclusion` — a settled finding.
4. Edge `relation`: `leadsTo` (one thought prompted the next), `confirms`, `contradicts`,
   `refines` (a sharper version of the same thought), `branches` (a parallel line of attack).
   Both endpoints must be node ids you defined.
5. Set `inferred: true` on an edge whose relationship you are reading between the lines
   rather than something the builder stated. Inferred edges still need a citation for both
   endpoints.
6. Set `hazard: true` on nodes describing a fault, risk or failure.
7. `timeTag` is the source tag of the moment the thought occurred, when the evidence gives
   one.
8. Keep `label` short (2–6 words) and `detail` to one sentence. Preserve every number, unit,
   pin and part name exactly.

# Cross-cluster affinities

The point of this map is that a conclusion often appears when two separate trains of thought
turn out to touch. List pairs of nodes **from different clusters** that you believe are
causally or physically connected. For each, state the connection in one sentence and cite the
evidence that supports it.

- If the evidence genuinely supports the link, cite it.
- If you suspect a link but the evidence does not establish it, still list the pair and say
  what is missing in `why`, with `sources` empty. Those become questions for the builder
  rather than claims.
- Never link two nodes just because they are both in the story. An unsupported guess with no
  explanation is worse than no guess.

# Output

Reply with JSON only:

```
{
  "clusters": [
    { "id": "power", "title": "Power and switching", "subtitle": "Rail behaviour under load" }
  ],
  "nodes": [
    { "id": "reset-on-switch", "clusterId": "power", "kind": "observation",
      "label": "Resets when the relay switches", "detail": "The controller restarted on coil de-energization.",
      "hazard": true, "timeTag": "voice 14:02", "sources": ["voice 14:02"] }
  ],
  "edges": [
    { "from": "reset-on-switch", "to": "kickback-hypothesis", "relation": "leadsTo",
      "label": "suspected back-EMF", "inferred": false, "sources": ["voice 14:02"] }
  ],
  "affinityCandidates": [
    { "nodeA": "kickback-hypothesis", "nodeB": "shared-ground",
      "why": "The coil and the logic rail share a ground return, which is how the transient reaches the controller.",
      "sources": ["voice 14:10"] }
  ]
}
```
