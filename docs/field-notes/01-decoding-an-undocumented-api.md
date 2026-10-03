# Field Note 01 — Decoding an undocumented API

**What this note demonstrates:** how capture-to-contract, an in-band error
census, and silent limit bisection turn an API with no reliable documentation
into a contract you can replay and trust.

**Skills exercised:** `deep-reverse-engineering`, `recon`,
`protocol-cartography`, `evidence-protocol`.

## Context

A partner integration API for asynchronous document conversion. We had a
written integration agreement, our own account, and no usable reference: the
partner's documentation covered a legacy version, and the partner's own client
library was the only artifact that behaved like the service. Scope: submit a
conversion job, poll it, fetch the result — read and write on those three
paths only.

Commands below use `$BASE` for the API origin and `$TOKEN` for the credential
issued to our account. Values, sizes, and payloads are shapes, not the real
captures.

## What was unknown

- The actual request and response shapes — the documentation showed different
  field names than the client library used (`[REP]`).
- Which route was authoritative: a synchronous path and an asynchronous path
  exposed the same capability with different error domains (`[INF]` at start).
- How failures present: nothing was known about non-2xx semantics or
  payload-level failures.
- Whether hard caps existed on body size or output length, and where.

## Timeline

### Perceive — 2026-01-12 to 2026-01-13

The first pass ranked sources honestly: the live service above its own client,
the client above the documentation, the documentation above our assumptions.
We drove every operation once with the client library and kept complete
exchanges: request, response, timing, identifiers.

The error census was run deliberately, not waited for. We sent malformed
bodies, missing fields, an expired credential, and wrong job identifiers, and
recorded how each failure presented.

Two findings changed everything:

1. **Transport status was not a signal.** A rejected submission returned
   HTTP 200 with a failure document in the body (`[OBS]`, 2026-01-12).
   Nothing in the headers distinguished success from rejection; only a
   payload field did.
2. **A limit was silently enforced.** A large but valid submission returned
   200 with a body that looked complete, but a completion field in the
   payload was absent and a checksum did not match the returned data
   (`[OBS]`, 2026-01-13). There was no error, no warning, no partial-status
   header. The service had truncated output and called it success.

By the exit gate, every load-bearing fact was `[OBS]` with a capture or probe
command attached, and each surface carried a protection classification:
silent — quiet caps and throttle windows, no human step observed.

### Model — 2026-01-14

We wrote the minimal contract from the captures: required fields, optional
fields, identifier placement, and the polling sequence. Then we replayed it
from a clean state with a single call chain, and it worked; the contract
predicted the response shape before the call.

The error census became a table with one programmed reaction per payload code:
retry-with-backoff, fix-and-resubmit, stop, or disable. Silent truncation got
its own row, and the row said: treat as failure and re-probe, never as
success.

The silent cap was found by bisection. We held the request fixed and varied
one axis — payload size — between a value known to work and one known to
fail. The boundary landed between the two, reproducibly. We bisected again on
a second day to check the boundary was stable (`[OBS]`, 2026-01-15), encoded
the cap with a safety margin in the harness, and kept the probe as a
regression check.

### Execute — 2026-01-15

The smallest harness: submit, poll, fetch, end to end, one path. Because the
census was done first, failure handling was classified from day one instead
of bolted on: a contention code retried once; a shared throttle code paused
globally with jitter; a hard-limit code stopped; an authorization code
refreshed once and then disabled the credential; a success-shaped failure
raised as failure.

The most consequential change from the census: the retry layer branched on
the payload field, not on the HTTP status. Before that change, every rejected
submission looked successful to the retry loop, so it returned empty results
downstream and said nothing. After the change, retry counts dropped to near
zero — most "retries" had been the harness retrying an operation the service
had already rejected — and a hard cap stopped being misread as an outage.

### Verify — 2026-01-16

The gate function ran before any claim: identify the proving command, run it
fresh, read the whole output, count failures, decide, then speak.

Falsification first: we broke the payload check deliberately (reverted the
branch) and watched it misclassify a rejected submission as success — the
right reason for the check to exist — then restored it and watched it pass.

The replay test ran twice from a clean state. The second run proved what the
first could not: no duplicate side effects, because the harness minted a
fresh request identifier per attempt and the service echoed it.

The silent limit probe was repeated with the same margin on both sides of the
boundary. A final negative check confirmed the truncation signal appears
exactly when the cap is crossed, not before (`[OBS]`, 2026-01-16).

### Evolve — 2026-01-19

The run ended with a memory triad: lessons (symptom, cause, fix), state (the
contract, the error census, the bisected boundary, each dated), and an
append-only run log. The first lesson recorded was the one that had cost the
most: "HTTP 200 with a failure payload" is not an edge case in this service;
it is the normal failure channel.

## The evidence trail

Commands are shown generically; `$BASE` and `$TOKEN` stand in for the origin
and credential.

```bash
# submit — capture the request and the full response
curl -sS -X POST "$BASE/v1/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": "...", "request_id": "..."}'

# poll — watch the payload field, not the status
curl -sS "$BASE/v1/jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN"

# fetch — verify the checksum before accepting the result
curl -sS "$BASE/v1/jobs/$JOB_ID/result" -H "Authorization: Bearer $TOKEN"
```

Observed result summaries (sanitized):

| Probe | Observed |
|---|---|
| malformed body | 200 with a failure document naming the bad field |
| expired credential | 200 with an auth-failure document; no header signal |
| oversized payload | 200 with truncated data and a failing checksum |
| known-good payload | 200 with a complete document and matching checksum |
| boundary bisection | silent truncation began between the known-good and known-failing sizes; stable across two days |

## What surprised the engineer

That success-shaped failure was the *default*, not the exception: the service
signaled rejection only in the payload. The second surprise was how much
retry logic had been compensating for a classification mistake. Once the
harness branched on the payload, most of the "flakiness" disappeared; the
system had been telling us no, and we had been reading it as maybe.

## The mistake avoided

Writing the retry policy before the error census. The census was scheduled as
a small, almost ceremonial step; it turned out to be the design. Had we
skipped it, the harness would have shipped with a retry loop that hammered a
service which had already answered — the exact way a boring integration
becomes an incident.

## What would be done differently

- Bisect silent limits during the first perception pass, not after the
  contract replayed. The boundary was knowable on day one.
- Keep captures as diffable fixtures from the start. The first contract
  change was caught by accident; the next one should be caught by a test.

## Patterns used

From the [pattern library](../PATTERNS.md): **Truth hierarchy**, **Surface
taxonomy**, **Protection classification**, **Capture-to-contract**, **In-band
error census**, **Silent limit bisection**, **Route-variant mapping**, **Gate
function**, **Falsification (red-green)**, **Airtight probe**.

Skills loaded:
[`deep-reverse-engineering`](../../skills/deep-reverse-engineering/SKILL.md),
[`recon`](../../skills/recon/SKILL.md),
[`protocol-cartography`](../../skills/protocol-cartography/SKILL.md),
[`evidence-protocol`](../../skills/evidence-protocol/SKILL.md).
