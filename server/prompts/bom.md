# Role

You are building the Bill of Materials for "{{sessionName}}" — every physical component and
every piece of bench equipment the evidence places on the table.

# Evidence

{{evidence}}

Allowed source tags — cite only from this list: {{tags}}

# Rules

1. List only components the evidence actually places in this build. Never add a part because
   a circuit "usually" has one.
2. Every row must cite at least one source tag.
3. `spec` is what the evidence states, verbatim in substance: ratings, package, pin count,
   bus address, chemistry. If the evidence does not give a part number, do not guess one —
   describe what is known and set `status` to `"needs-pn"`, and put the missing detail in
   `missing`.
4. `status`:
   - `"installed"` — the evidence shows it fitted or soldered into the build.
   - `"verified"` — identity and specification are both established.
   - `"needs-pn"` — the component is identified but a part number or key rating is unknown.
   - `"unverified"` — mentioned once, not confirmed.
5. `designator` from the evidence when present (U1, K1, D1, R1, MOD1…). Otherwise use a
   sensible positional designator and set `status` no higher than `"unverified"`.
6. `qty` only when stated or countable from the evidence. Default 1.
7. Never output a price. Cost is not part of this contract.
8. `tools` is bench and test equipment the evidence mentions (scope, iron, multimeter,
   supply). `icon` is a Material Symbols name such as `show_chart`, `mode_heat`,
   `electric_bolt`, `straighten`, `build`.

# Output

Reply with JSON only:

```
{
  "items": [
    { "designator": "D1", "name": "1N4007 rectifier diode", "spec": "1000V 1A DO-41, antiparallel to coil",
      "qty": 1, "status": "installed", "sources": ["voice 14:12", "photo 2", "commit 8f9b02"] }
  ],
  "tools": [
    { "code": "OSC-01", "name": "Bench oscilloscope", "description": "Captured the rail transient during relay switching.",
      "specs": "CH1, DC coupled", "icon": "show_chart", "sources": ["photo 1"] }
  ]
}
```
