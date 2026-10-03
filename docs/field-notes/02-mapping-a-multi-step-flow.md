# Field Note 02 — Mapping a multi-step flow

**What this note demonstrates:** deriving a state machine from observed runs,
finding a lease with a lifetime, replacing blanket retries with a classified
taxonomy, and proving idempotency with a deliberate double submit.

**Skills exercised:** `deep-reverse-engineering`, `recon`, `flow-modeling`,
`evidence-protocol`, `durable-goals`.

## Context

A hosted job pipeline: submit a job, the service runs it in a per-job sandbox,
stages outputs, then lets the client fetch artifacts. We operated the client
side under an integration agreement for our own account. Scope: one submission
path, one polling path, one artifact path. Commands use `$BASE` for the
pipeline origin and `$TOKEN` for our credential.

## What was unknown

- How many states the flow had, and which transitions were reachable.
- The lifetime of the per-job sandbox, and what happens when it ends.
- Whether the sandbox is re-adoptable after a client restart.
- What failure classes look like, and what each should trigger.
- Whether a duplicate submission duplicates the job and the charge.

## Timeline

### Perceive — 2026-02-09 to 2026-02-10

We observed two complete runs end to end and recorded every request, response,
and transition. The decisive observation was a lease identifier returned at
submission: every job owned a sandbox (`[OBS]`, 2026-02-09). There was no
documentation for it; it existed because the response said so.

Then we probed the lease's lifetime. Two jobs were left running with polling
at a fixed cadence. A touch call extended an active lease, but once a sandbox
expired, a later poll returned a document indistinguishable from "this job
never existed" (`[OBS]`, 2026-02-10). No error class separated "expired" from
"unknown" — the distinction lived only in our own records.

Renewal was sliding: interactions extended the window, and a quiet run lost
its sandbox before the nominal life elapsed (`[OBS]`, 2026-02-10).

### Model — 2026-02-11

The state machine came from the observations, not from imagination:

```text
submitted ──▶ leased ──▶ running ──▶ staged ──▶ collected
                 │            │           │
                 ▼            ▼           ▼
              expired      expired     expired
```

Each state mapped to a persisted field and a log line; `expired` was terminal
and not resurrectable. Resume points were explicit: a restart mid-run
re-adopted a live lease by its identifier; a restart after expiry could only
start over.

The retry taxonomy was written before any retry code, one behavior per class:

| Class | Observed presentation | Reaction |
|---|---|---|
| Contention | a busy document for one job | immediate retry after a pause |
| Shared throttle | the same document across jobs | global backoff with jitter |
| Hard cap | an explicit refusal naming a limit | stop; do not hammer |
| Authorization | an auth failure document | refresh once, then disable |
| Outage | transport failures across paths | pause the lane, keep one canary |
| Expired lease | a not-found-shaped document | start a new lease; never poll into it |

The deadline clock got its own table row: renew inside the window or lose the
sandbox; pause to the reset window, not into it.

### Execute — 2026-02-12

Minimal harness: submit, poll to staged, fetch, mark collected. Two safety
properties were built in from the start because the model said so: a fresh
request identifier per attempt (replay safety), and a persistent idempotency
key per logical job.

Then the double-submit test, run deliberately:

- Two submissions with distinct identifiers: two jobs, two sandboxes, two
  executions (`[OBS]`, 2026-02-12). The pipeline did not deduplicate anything
  on its own.
- One logical job submitted twice with the same idempotency key: one job,
  one execution, the second response echoing the first (`[OBS]`, 2026-02-12).

That test converted a documentation question into a fact. The key was minted
once per logical job and persisted, not regenerated per retry.

The collector was made idempotent with a seen-set, and consumed artifacts were
renamed, not deleted, so a replay could not double-collect and the audit trail
survived.

### Verify — 2026-02-13

Three drills, each with a captured output:

1. **Kill-and-resume.** The harness was killed mid-run; resume re-adopted the
   live lease by identifier, skipped completed states, and collected once
   (`[OBS]`, 2026-02-13).
2. **Double collection.** The collector ran twice over the same staged
   artifacts: zero additional merges the second time (`[OBS]`,
   2026-02-13).
3. **Deadline pause.** The lane was paused before a scheduled reset window
   and resumed after it; the pause state survived a restart, and no request
   touched the window (`[OBS]`, 2026-02-13).

The retry counters were read after the drills: every retry had a class
attached, and the hard-cap counter was zero because the harness now stops
instead of hammering.

### Evolve — 2026-02-16

The memory triad recorded the flow map, the lease facts with dates, and the
drills' outputs. The first lesson: a client cannot distinguish "expired" from
"never existed" using the pipeline alone, so the client's own ledger is the
authority for lease history. The second: sliding renewal means the deadline is
activity-driven, and a quiet runner loses its sandbox — schedule a renewal
inside the safety margin, never at the boundary.

## The evidence trail

```bash
# submit — one idempotency key per logical job
curl -sS -X POST "$BASE/v1/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $JOB_KEY" \
  -d '{"input": "...", "request_id": "..."}'

# poll — observe the state field, not the transport status
curl -sS "$BASE/v1/jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN"

# renew — inside the margin, never at the boundary
curl -sS -X POST "$BASE/v1/leases/$LEASE_ID/touch" \
  -H "Authorization: Bearer $TOKEN"

# collect — rename on consumption
curl -sS "$BASE/v1/jobs/$JOB_ID/artifacts" -H "Authorization: Bearer $TOKEN"
```

Observed result summaries (sanitized):

| Probe | Observed |
|---|---|
| two distinct submissions | two jobs, two leases, two executions |
| replay with one idempotency key | one job; second response echoed the first |
| restart mid-run | live lease re-adopted; work resumed; collected once |
| poll after expiry | not-found-shaped document; no distinct error class |
| renew inside margin | lease extended; expiry never reached |
| collector replay | zero additional merges |

## What surprised the engineer

Two things. First, that "not found" could mean "expired": a terminal state
that presents as absence is invisible to any retry policy that only knows
presence. Second, how much a blanket backoff had been hiding — during an early
run against a busy window, a uniform retry policy produced a retry stream
that tripped a shared throttle and then read as an outage. The taxonomy did
not make failures rarer; it made them legible, one class per counter.

## The mistake avoided

Inferring idempotency from a documentation sentence that said duplicate
submissions were handled (`[REP]`, undated). The double-submit test disproved
it in an afternoon: distinct identifiers produced distinct jobs. Inheriting a
claim from prose would have shipped duplicate work and duplicate charges into
production.

## What would be done differently

- Instrument the lease at first observation: lifetime, renewal, and the expiry
  presentation are the flow's spine, and they were probed second.
- Put the deadline clock next to the state diagram from the start; the pause
  logic came late because the clock was discovered late.

## Patterns used

From the [pattern library](../PATTERNS.md): **Flow state machine**, **Lease
lifecycle**, **Retry taxonomy**, **Nonce & idempotency discipline**,
**Deadline clocks**, **Crash-safe run state**, **Artifact lifecycle**,
**Gates that actually gate**, **Backpressure law**.

Skills loaded:
[`deep-reverse-engineering`](../../skills/deep-reverse-engineering/SKILL.md),
[`recon`](../../skills/recon/SKILL.md),
[`flow-modeling`](../../skills/flow-modeling/SKILL.md),
[`evidence-protocol`](../../skills/evidence-protocol/SKILL.md),
[`durable-goals`](../../skills/durable-goals/SKILL.md).
