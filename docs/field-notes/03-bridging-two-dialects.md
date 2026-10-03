# Field Note 03 — Bridging two dialects

**What this note demonstrates:** converting between two API dialects
structurally, never by stringification, and proving the bridge with fixtures
and an end-to-end loop comparison.

**Skills exercised:** `deep-reverse-engineering`, `protocol-cartography`,
`evidence-protocol`.

## Context

Two systems we operate needed to talk: an orchestration layer that represents
work as message turns with typed content blocks, and a hosted service that
represents the same work as named action calls with argument maps. Neither
side was going to change dialect for the other. Scope: build a bridge that
accepts one dialect and emits the other, in both directions, for a single
action loop.

Generic terms only: Dialect T (turns) and Dialect C (calls). `$BASE_T` and
`$BASE_C` stand in for the two origins; `$TOKEN` for the relevant credential.

## What was unknown

- Which fields carried the action identity in each dialect, and how an action
  call maps to a message turn.
- Where stop reasons live and which values are terminal.
- How the two dialects account for usage.
- What the error shape looks like on each side of the bridge.
- Whether a structural mapping can round-trip without losing action results.

## Timeline

### Perceive — 2026-03-02 to 2026-03-03

We ran the same task directly against each side and captured both exchanges
completely, side by side.

The decisive observation was structural, not textual. Dialect C announces an
action as one object with a name and an argument map; Dialect T expresses the
same announcement as a content block inside a message turn. On the result
side, Dialect C returns an action result keyed by the call identifier, while
Dialect T expects a result turn that references the original action block.
Neither shape is a string of the other; the two are different trees.

An early smoke attempt converted the action object with a textual
serialization into the T content field. It worked once (`[OBS]`,
2026-03-02): the turn was accepted and an answer came back. The end-to-end
loop comparison — the same task run through the naive bridge and directly —
showed the failure the smoke test could not: the orchestration layer never saw
a structured action result, re-issued the same action, and the loop did not
terminate (`[OBS]`, 2026-03-03).

### Model — 2026-03-04

The conversion map was written both directions before code:

| Concept | Dialect T | Dialect C | Conversion |
|---|---|---|---|
| action call | content block with type and fields | named call object with argument map | map fields to a structured object; never stringify |
| action result | result turn referencing the block | result keyed by call id | key the result to the echoed call id |
| terminal reason | stop field on the final turn | status field on the response | map values explicitly; unknown maps to a hard failure |
| usage | per-turn counters | per-response totals | sum per-turn into one totals object |

One rule governed everything: convert structurally. An object serialized into
a text field is a one-way door; the receiving side cannot act on it and cannot
round-trip it.

The map also named the failure mode that had produced the loop: a missing or
unmapped terminal reason. When the bridge emitted a final turn without a stop
value, the client on the other side waited rather than concluded.

### Execute — 2026-03-05

The bridge was rebuilt as a structural transformer: parse one dialect into an
internal tree, transform the tree, emit the other dialect. Action calls became
structured objects, results were keyed to the echoed call identifier, stop
reasons were mapped through an explicit table, and usage was summed into a
single totals object. An unknown dialect construct was rejected loudly instead
of being passed through.

Each side's capture was kept as a dated fixture — request, response, and the
expected conversion — and the transformer was tested against fixtures rather
than against a live service.

### Verify — 2026-03-06

Falsification first: a fixture was mutated deliberately (the call identifier
changed in the result), and the mapping check was watched failing for the
right reason — a mismatched key, not a crash — before it was trusted.

Then the fixture suite ran: every captured exchange converted both ways, with
byte-stable expected outputs. A round-trip test confirmed that a structural
conversion in both directions reproduced the original tree.

Finally, the end-to-end loop comparison: the same task was run through the
bridge and directly against the target dialect, and the final answers were
compared structurally — same action sequence, same terminal reason, same usage
totals (`[OBS]`, 2026-03-06). The loop terminated on both sides with the same
stop value.

### Evolve — 2026-03-09

The fixtures were dated and stored beside the bridge; the dialects drift, so
the suite is a regression net, not a certificate. Two lessons were recorded:
"worked once" is not evidence for a transformer — the end-to-end loop
comparison is the cheapest way to falsify a conversion; and a terminal reason
omitted by conversion is a hang, not an error, so the mapping must fail
closed.

## The evidence trail

```bash
# dialect T — capture the task as turns
curl -sS -X POST "$BASE_T/v1/turns" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"task": "...", "stream": false}'

# dialect C — capture the same task as a call
curl -sS -X POST "$BASE_C/v1/actions" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action": "...", "arguments": {}}'

# bridge — one request, converted both ways; fixtures saved beside it
curl -sS -X POST "$BRIDGE/v1/run" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"dialect": "...", "payload": {}}'
```

Observed result summaries (sanitized):

| Probe | Observed |
|---|---|
| textual conversion of an action call | one accepted turn, then a repeated action; loop did not terminate |
| structural conversion | action result keyed to the echoed call id; loop terminated |
| mutated fixture | mapping check failed on key mismatch, as intended |
| round-trip test | original tree reproduced from the converted tree |
| end-to-end comparison | same action sequence, terminal reason, and usage totals on both paths |
| missing terminal reason | client waited on a turn that never concluded |

## What surprised the engineer

That the stringified bridge passed the first test it was given. A smoke test
of "does a response come back" answered yes, and the failure — a loop that
never terminates — only appeared when the loop itself was the comparison unit.
The unit of testing has to match the unit of the contract.

## The mistake avoided

Shipping after a single green run. The structural rewrite was the plan; the
temptation was to keep the stringified converter because it "already worked".
The end-to-end loop comparison turned a plausible afternoon into a fact: the
naive bridge could not round-trip an action, and no amount of retry logic
downstream could fix that.

## What would be done differently

- Write the conversion map and the fixtures before writing the bridge; the map
  was already derivable from the first captures.
- Treat the end-to-end loop comparison as the first verification gate, not the
  last. It is the only test that exercises the property the bridge exists to
  provide.

## Patterns used

From the [pattern library](../PATTERNS.md): **Dialect bridging**,
**Route-variant mapping**, **Capture-to-contract**, **Multi-turn threading**,
**Falsification (red-green)**, **Adversarial self-test suite**, **Airtight
probe**.

Skills loaded:
[`deep-reverse-engineering`](../../skills/deep-reverse-engineering/SKILL.md),
[`protocol-cartography`](../../skills/protocol-cartography/SKILL.md),
[`evidence-protocol`](../../skills/evidence-protocol/SKILL.md).
