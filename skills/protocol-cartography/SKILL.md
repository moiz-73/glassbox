---
name: protocol-cartography
description: >-
  Derive an executable contract for an API or stream you are authorized to
  integrate, working from captures rather than documentation. Use when decoding
  a streaming session (server-sent events, WebSocket, chunked JSON), parsing
  terminal deltas, building an in-band error census, finding silent limits,
  mapping route variants, bridging two API dialects, emulating a stream over a
  non-streaming backend, documenting sanctioned-client validation, or keeping
  multi-turn threading keys consistent. Not for surface and quota recon
  (`recon`) or retry, lease, and run state design (`flow-modeling`).
license: MIT
metadata:
  version: 1.0.0
---

# Protocol Cartography

A protocol is a contract you can only trust after you have replayed it. This
skill derives that contract from captures: event grammars for streams, a
terminal-delta rule for fragmented payloads, an in-band error census, the real
limits behind the advertised ones, and the conversion map that lets two
dialects interoperate. The output is a minimal reproducer that works from a
clean state — not a summary of documentation.

## Decision table

| Situation | Action | Load |
|---|---|---|
| The real contract is undocumented or misdocumented | Capture every operation; write the minimal contract; replay it | Method 1 |
| A protocol streams state updates | Write the event grammar before writing the parser | Method 2 |
| A payload arrives in fragments plus a final copy | Parse the terminal delta as authoritative | Method 3 |
| Failure hides inside success-shaped responses | Build the in-band error census | Method 4 |
| A hard cap exists but its value is unknown | Bisect between known-good and known-failing | Method 5 |
| The same capability exists on several routes | Benchmark variants; write the routing policy | Method 6 |
| Two dialects must interoperate | Build the bidirectional conversion map | `references/bridging-dialects.md` |
| A fast backend is non-streaming but clients need a stream | Emit a conforming stream; measure the win | `references/streaming-and-errors.md` |
| Requests are validated against a sanctioned client shape | Document the contract dimension; stay on the sanctioned path | Method 9 |
| A multi-turn conversation loses context | Persist threading keys; test recall | Method 10 |
| Streams hang or die during long idle gaps | Add heartbeat and timeout hardening | Method 11 |

## Golden rules

1. **Capture first, contract second.** Documentation lags the wire, and a
   contract written without a capture is a story. Keep captures as the source
   of truth and diff them when behavior changes.
2. **Replay or it did not happen.** A contract validated only by reading
   proves nothing; replay a minimal reproduction from a clean state.
3. **The terminal delta wins.** Where a value arrives as streamed fragments
   and again as a compact final copy, the final copy is authoritative; naive
   concatenation duplicates payloads.
4. **Transport success is not success.** Branch on payload fields. Semantic
   failure frequently arrives inside a success-shaped response, including
   empty bodies that look complete.
5. **Every stream has two possible endings.** Write the parser for both a
   sentinel and a plain close; assuming one ending produces hangs on the
   other, and assuming one event per logical step breaks on heartbeats.
6. **A limit you have not bisected is a rumor.** Advertised caps are
   hypotheses; silently enforced caps are the dangerous class.
7. **Convert structurally, never by stringifying.** Object-to-string artifacts
   in foreign dialects cause loops that never terminate and results that
   cannot be round-tripped.
8. **Contracts are perishable.** Date every capture and fixture, and re-probe
   after platform changes; last quarter's grammar is today's hypothesis.

## The method

### 1. Capture to contract

1. Capture real traffic end-to-end for every operation you need: request,
   response, ordering, timing, identifiers, headers.
2. Write the minimal contract from the captures: required and optional
   fields, encodings, ordering, identifiers.
3. Validate by replaying a minimal reproduction from a clean state; if the
   replay fails, update the contract rather than explaining the failure away.
4. Keep captures and reproducer next to the work; when behavior shifts, diff
   new captures against the old ones.

Exit gate: a reproducer that works from a clean state, plus its capture.

### 2. Write the streaming event grammar

1. Capture a full session and list every event type in order.
2. Identify phases: opening, progress deltas, action phases, intermediate
   results, terminal, end condition.
3. Locate telemetry fields (usage, sequence numbers) and heartbeat frames.
4. Write the parser against the grammar, not one sample's order; tolerate
   unknown event types instead of failing on them.

The grammar template and parser shape are in `references/streaming-and-errors.md`.

### 3. Parse the terminal delta

1. Inspect whether a payload arrives twice: fragment deliveries plus a
   compact final value.
2. Parse the terminal event for the authoritative value; use fragments only
   for progress display.
3. Test against a capture containing both deliveries, and assert the terminal
   event's shape so format drift fails loudly instead of producing a
   concatenated result.

Exit gate: no duplicated or concatenated payloads in any parsed result.

### 4. Build the in-band error census

1. Probe the error space deliberately: malformed input, missing fields,
   expired authorization, wrong identifiers, oversized bodies.
2. Build the census table: payload code, meaning, correct reaction. Expect
   success-shaped transport with failure-shaped bodies, empty-but-success
   responses, silent truncation, and failures that arrive later.
3. Branch on payload fields, never on transport status alone, and re-run the
   census after platform changes; the table is perishable.

### 5. Discover silent limits

1. Pick one measurable axis: body bytes, payload length, output size, file
   size, concurrency.
2. Bisect between a value known to work and one known to fail.
3. Record both failure modes: explicit rejection and silent death. The silent
   class is dangerous because it looks like success.
4. Encode the boundary into the harness with a safety margin; keep the probe
   as a regression check.

Exit gate: boundary pairs with reproducible probes; both failure modes named.

### 6. Map route variants

1. Enumerate variants: streaming versus non-streaming, service tiers,
   protocol dialects.
2. Benchmark each: latency, throughput, error profile, feature support.
3. Probe error domains separately; a validation on one route may not exist
   on another. Re-probe before blaming authorization for a route failure.
4. Write the default routing policy and fallback order as a decision.

Details and a routing table template are in `references/bridging-dialects.md`.

### 7. Build the dialect conversion map

Write the mapping both directions: field placement, action definitions,
result turns, stop reasons, usage. Convert structurally; never stringify one
side's objects into the other. Run an end-to-end action loop through the
bridge, compare the final answer with a direct run, and keep fixtures as
regression tests. Full procedure: `references/bridging-dialects.md`.

### 8. Emulate a stream over a non-streaming backend

When the fast backend returns one response but clients require a stream,
confirm the speed gap back-to-back first, then emit a conforming stream:
opening event, content events, action announcements and arguments, finish
reason, usage, terminal sentinel. Verify conformance with a standard client;
measure latency in the same window as the baseline. Template:
`references/streaming-and-errors.md`.

### 9. Treat caller validation as an authorization boundary

Some platforms accept only the shape of their own sanctioned client. Treat
that validation as an authorization boundary, not an obstacle: work from the
sanctioned path, use the platform's documented update process, or stop and
ask. Keep a canary call that fails loudly so tightening is detected rather
than discovered as an outage, and track version changes as dated
observations. This skill never covers presenting an unsanctioned caller as a
sanctioned one. Interactive surfaces route to a human (`honest-fences`).

### 10. Keep multi-turn threading keys

1. Identify threading fields: session id, parent message id, current tip id.
2. Persist identifiers after every turn; the returned tip is the next parent.
3. Respect branching: after a branch, the old parent is not the tip. Beware
   per-context resources that do not survive across threads.
4. Test a two-turn recall and store the result as a fixture.

Exit gate: recall works from persisted state; the on-disk tip matches the
returned tip.

### 11. Harden timeouts and keep-alives

1. Emit heartbeats during long gaps so intermediaries do not close an idle
   connection; clear the heartbeat timer when the stream ends.
2. Size timeouts from measured tail latency, not defaults.
3. Abort upstream work when the client disconnects, so orphaned work does
   not hold capacity.
4. Reject oversized bodies cleanly with a proper status instead of tearing
   the socket.

**Exit gate.** A clean-state reproducer; a parser covering every phase and
both endings; an error census with a distinct reaction per class; dated
fixtures for every claim.

## When NOT to use

- You need surface, protection, or quota facts — use `recon`.
- You need state machines, retries, leases, or crash-safe run state — use
  `flow-modeling`.
- A current, documented contract exists and replay confirms it — build.
- The task is to make an unsanctioned caller pass as a sanctioned one; that
  is outside this method. Route to the sanctioned path or stop.

## References

- `references/streaming-and-errors.md` — event grammar, terminal-delta law,
  error census, silent limits, heartbeat hardening, stream emulation. Read it
  when parsing or producing a stream.
- `references/bridging-dialects.md` — route variants, dialect conversion,
  threading keys, sanctioned-client validation. Read it when bridging two
  shapes or two routes.
- `recon` — supplies the captures this skill consumes.
- `flow-modeling` — consumes the contract this skill produces.
