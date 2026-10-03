# Streaming and Errors — field manual

Long-form companion to `protocol-cartography/SKILL.md`. Read it when parsing
a stream, producing one, or building an error census.

Contents:

1. The capture set for a streaming session
2. Event grammar template
3. Parser shape and unknown-event tolerance
4. Terminal-delta law
5. In-band error census
6. Silent limit discovery
7. Timeout and keep-alive hardening
8. Emulated streaming
9. Verification checklist

---

## 1. The capture set for a streaming session

Record more than the payload. A grammar derived from payloads alone is
missing the mechanics that decide whether the parser survives production.

| Element | Why it matters |
|---|---|
| Opening exchange: request, response headers, first event | Defines the session and any negotiated parameters |
| Full event sequence with timing | Reveals phase order, pacing, and gaps |
| Each event's type field and payload shape | The grammar's raw material |
| Heartbeat or keep-alive frames, if any | Parsers that crash on these crash in production |
| Terminal sequence | Distinguishes sentinel-close from socket-close |
| Close mechanism and status | The end condition, including abnormal ends |
| Telemetry fields: usage, sequence numbers, timing | Reconciliation and gap detection |
| Error cases: malformed, expired, oversized | Feeds the census in section 5 |

Capture at least one complete session that reaches its natural end, one that
is cut off mid-stream, and one that errors semantically without a transport
failure. The middle case is the one parsers get wrong.

## 2. Event grammar template

Write the grammar as a phase list, not as prose, and keep it in a file next
to the parser.

```
open        -> session/created event with ids and any negotiated parameters
deltas      -> incremental content fragments; may be one or many
actions     -> announcement event, then argument/result events per action
intermediate-> partial results or statuses that are not the final answer
heartbeat   -> periodic keep-alive frames, payload usually irrelevant
terminal    -> finished/stopped event with a reason and final payload
usage       -> counters, often attached to the terminal event
end         -> sentinel event, or simply the server closing the stream
```

Rules the grammar must encode:

- Phase order is a guideline for prediction; the parser branches on event
  type, not on position. Some sessions skip phases entirely.
- The end condition has two legal forms: an explicit sentinel and a plain
  close. Both must terminate the stream loop cleanly.
- Heartbeats may arrive at any point, including between terminal and close.
- Unknown event types are data, not errors: log them, count them, and keep
  going. A platform that adds a field should not break the parser.
- Telemetry fields may be cumulative or per-event; verify with captures
  rather than assuming.

## 3. Parser shape and unknown-event tolerance

A safe parser is a small state machine:

1. Read the stream frame by frame; frame boundaries come from the transport's
   own delimiting, not from payload inspection.
2. Dispatch on the event type field into a handler per phase.
3. Accumulate progress fragments only into a display buffer.
4. On the terminal event, capture the final payload and mark the session
   complete.
5. On close, if no terminal event was seen, mark the session incomplete and
   surface it — do not treat a silent close as a finished run.
6. Assert the terminal payload's shape (required fields present, types
   correct) so format drift fails loudly.

Keep the state machine small enough to test: feed it recorded captures, one
per scenario, and assert the parsed result and the completion marker.

## 4. Terminal-delta law

Some protocols deliver accumulated text twice: once as spaced or fragment
deltas while generating, and once as a compact final value on the terminal
event.

- The terminal copy is authoritative. Fragments exist for progress display.
- Never concatenate all fragments into the result. Doing so duplicates the
  payload when the final copy is also present, and produces a wrong answer
  silently.
- Test with a capture known to contain both deliveries, and assert the
  parsed result equals the terminal value exactly.
- Guard the parser with a shape assertion on the terminal event; if the
  terminal event stops carrying the payload, fail rather than fall back to
  fragment concatenation.

Exit gate: no duplicated or concatenated payloads in any parsed result.

## 5. In-band error census

Transport status does not reflect semantic failure on many platforms. Build
a census from deliberate probes and give every class its own programmed
reaction.

Procedure:

1. Probe malformed input, missing fields, expired authorization, wrong
   identifiers, and oversized bodies.
2. For each observed failure, record the envelope: transport status, payload
   code, message, and any state change.
3. Classify the shape: success transport with failure body; empty response
   that looks complete; silent truncation; delayed asynchronous failure.
4. Assign one reaction per class.

| Class | Shape | Reaction |
|---|---|---|
| Explicit rejection | Failure status plus a code | Branch on the code; act per class |
| In-band failure | Success status, failure payload | Treat as failure; surface the code |
| Empty-but-success | Success status, empty result | Re-probe once before concluding anything |
| Silent truncation | Success status, short payload | Compare against a known-good length or checksum |
| Delayed failure | Arrives after the call returns | Reconcile asynchronously; mark the earlier result provisional |

The census is perishable: platform changes add and remove classes. Re-run it
after every change notice and after every unexplained failure. Branching on
transport status alone is how a run reports success while nothing happened.

## 6. Silent limit discovery

Advertised limits are hypotheses; the enforced limit is a measurement.

1. Choose one measurable axis: body bytes, payload length, output size, file
   size, or concurrency.
2. Bisect between a known-good value and a known-failing value. Keep the
   probes tiny and reproducible so the boundary can be re-found after a
   change.
3. Record both failure modes: explicit rejection and silent death. Silent
   death is the dangerous one — the call appears to succeed, and the loss is
   discovered downstream.
4. Encode the boundary into the harness with a safety margin, and keep the
   bisection probe as a regression test.

Boundary table entries should read like: smallest failing value, largest
passing value, failure mode, date, probe command. Numbers without probes are
rumors.

## 7. Timeout and keep-alive hardening

Long idles and intermediaries are where working streams die.

- Emit heartbeat frames during long gaps so intermediaries do not close an
  idle connection. Schedule the heartbeat before the gap begins, not after
  the write that needs it, and clear the timer when the stream ends.
- Size request timeouts from measured tail latency, not from defaults. A
  default timeout on a slow upstream converts a working call into a retry
  loop.
- Abort the upstream request when the client disconnects. Orphaned upstream
  work holds capacity and produces results nobody consumes.
- Reject oversized bodies cleanly with a proper request-too-large status
  rather than destroying the socket; a torn socket can take the process down
  with it.

Exit gate for a streaming client: no hung streams under long idle, no
orphaned upstream work after client disconnect, no process death on oversize
input.

## 8. Emulated streaming

When the fast backend is request/response but clients require a stream, a
gateway can emit a conforming stream.

1. Confirm the speed gap back-to-back, in the same window, before engineering
   anything. If there is no measured gap, do not build it.
2. Issue the fast non-streaming request, then emit a stream in the target
   grammar: opening event, incremental content events, action announcement
   and argument events, finish reason, usage, terminal sentinel.
3. Verify conformance with a standard client from the target ecosystem; it
   should consume the emulated stream exactly like a native one.
4. Measure latency against the passthrough baseline in the same window, and
   keep the measurement with the code.

Chunk order is part of the contract. Emitting a non-conforming order — usage
before finish reason, arguments before the announcement, a missing sentinel —
breaks clients in ways that are hard to trace back to the gateway.

## 9. Verification checklist

- [ ] Grammar written from at least three captures: natural end, cut-off,
      semantic error.
- [ ] Parser dispatches on event type; unknown events are logged and skipped.
- [ ] Both end conditions handled: sentinel and plain close.
- [ ] Incomplete sessions are surfaced, never marked finished.
- [ ] Terminal-delta parsing tested against a dual-delivery capture, with a
      shape assertion guarding it.
- [ ] Error census complete, with a distinct reaction per class.
- [ ] Silent limit boundaries recorded with probes and both failure modes.
- [ ] Heartbeats scheduled and cleared correctly; timeouts sized from tail
      latency.
- [ ] Oversized input returns a clean rejection.
- [ ] Every fixture is dated; re-run the suite after any platform change.
