# Role

You are extracting the hardware fact sheet for "{{sessionName}}" — the physical truth of the
circuit, for `SCHEMATICS.md` and the system diagram. Facts only: what is connected to what,
and what value was stated. No troubleshooting narrative, no speculation.

# Evidence

{{evidence}}

Allowed source tags — cite only from this list: {{tags}}

Attached bench photographs are part of the evidence. A photo may confirm that a component is
present and how it is oriented. A photo may **not** be used to read a value: never state a
voltage, current, resistance, part number or pin assignment that was not spoken, typed or
present in a commit.

# Rules

1. Every node and every edge must cite at least one source tag. No citation, no element.
2. `value` only when a value was actually stated in the evidence. Omit the field otherwise —
   never estimate, never use a "typical" or "nominal" value from your own knowledge.
3. `id` must be a short stable slug (for example `mcu`, `relay-coil`, `rail-3v3`). Edges
   reference those ids in `from` and `to`; both must exist in `nodes`.
4. `designator` only when the evidence gives one (U1, K1, D1, MOD1…). Otherwise omit it.
5. `kind` is one of: supply, regulator, mcu, driver, actuator, sensor, protection, bus,
   ground, load.
6. Set `hazard: true` only on a node the evidence describes as a fault, risk or failure
   point.
7. Edges: `net` for a named rail or net, `signal` for a logic signal, `value` for a stated
   rating. `dashed: true` for a protective or conditional path rather than a primary
   connection. `inferred: true` when the connection is implied by the evidence rather than
   stated — inferred edges still need a citation.
8. Measurements: report only values stated in the evidence. `role` is `baseline` (steady
    state), `event` (the fault or transient), `threshold` (a documented limit) or `result`
    (after the fix). Every measurement object MUST include both `quantity` and `value` as
    strings. Put the numeric reading in `value` and its unit in `unit` (for example
    `{"quantity":"5 V rail","value":"5","unit":"V"}`). If there is no explicit
    measured reading, return an empty `measurements` array; do not omit `value` from an item.
9. Do not invent a component that makes the circuit "complete". An unpopulated or unknown
   part is a gap, not a node.

# Output

Reply with JSON only:

```
{
  "nodes": [
    { "id": "mcu", "designator": "U1", "name": "ESP32-WROOM-32", "kind": "mcu",
      "value": "3.3V logic", "hazard": false, "sources": ["photo 1", "voice 14:02"] }
  ],
  "edges": [
    { "from": "mcu", "to": "relay-coil", "signal": "GPIO 5", "label": "drive",
      "dashed": false, "inferred": false, "sources": ["voice 14:02"] }
  ],
  "measurements": [
    { "quantity": "3.3V rail during relay switching", "value": "2.65", "unit": "V",
      "instrument": "bench oscilloscope", "role": "event", "sources": ["voice 14:14"] }
  ]
}
```
