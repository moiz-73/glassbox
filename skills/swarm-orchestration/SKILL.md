---
name: swarm-orchestration
description: >-
  Plan and run many parallel workers without stalling the machine or the
  budget. Use when a job decomposes into independent scoped tasks, when fanning
  out subagents, when concurrency must be capped from live measurement, or when
  worker results must be collected and verified. Covers probe-before-fanout,
  measured caps and queued waves, scoping and prompt contracts, artifact
  verification, bounded retry, capability tiering, the cost curve of
  parallelism, and honest reporting. Not for sequential work, durable state
  (`durable-goals`), or refinement loops (`quality-loops`).
license: MIT
metadata:
  version: 1.0.0
---

# Swarm Orchestration

Parallel workers multiply throughput only when concurrency is measured, scopes
are disjoint, and results are verified. This skill is the operating doctrine
for fanning work out across cold workers and merging what comes back — without
melting the host, exhausting a shared resource, or shipping unverified output.

## Decision table

| Situation | Action | Load |
|---|---|---|
| About to fan out | Probe the host live; derive and log the cap | Method 1 |
| More tasks than capacity | Queue the overflow; drain in waves | Method 2 |
| Writing a task for a worker | Fill the worker scoping contract | Method 3 |
| Composing the worker prompt | Use the prompt contract; workers are cold | Method 4 |
| A worker returned | Verify its artifact, never its status line | Method 5 |
| A worker failed | Retry bounded, with failure context attached | Method 6 |
| Choosing the capability tier for a task | Tier by task complexity and turn count | Method 7 |
| Two workers need one exclusive resource | Lease it; expire stale leases with a sweeper | Method 8 |
| Estimating the cost of parallelism | Budget memory, context, and review bandwidth | Method 9 |
| Integrating results | Merge verified outputs only; report N/M honestly | Method 10 |

## Golden rules

1. **Concurrency is measured, not declared.** A loaded host turns a fanout
   into a stall, so the cap comes from a live probe and every fanout traces to
   the probe taken in the same session.
2. **One worker, one scoped deliverable, one verification step.** Vague
   delegations produce overlapping work, conflicting edits, and results nobody
   can check.
3. **Workers are cold.** They inherit none of the orchestrator's context, so
   the prompt must be self-contained and artifacts carry the detail.
4. **A status line is not evidence.** Collect the artifact and run its check;
   "done" in a summary proves nothing.
5. **Retries are bounded and informed.** A retry without new context is a
   repetition; after the bound, block with evidence.
6. **Every exclusive shared resource has a lease with an expiry.** Two
   concurrent workers must never hold the same one.
7. **Merge verified outputs only, and report the real state.** Per-worker
   outcomes (N/M succeeded) and what was done about failures are part of the
   deliverable.

## The method

### 1. Probe before fanout

Measure the host live before any parallel dispatch: free memory, CPU or load,
disk pressure, and anything else that can be exhausted. Derive a safe maximum
with explicit rules — memory per worker plus the base memory cost of the host
process, a reduction tier when load is already high, and an always-free safety
buffer. Record the measurement and the derived cap alongside the run. Never
reuse a probe from another session; the machine changed since then. Probing
technique lives in `recon`; the fanout doctrine lives here.

### 2. Cap concurrency and queue waves

Drain tasks through a bounded pool at the measured cap; queue the overflow and
run it in the next wave. Never drop a task because the cap is full. Give every
wave a timeout so one stuck worker cannot hang the run. Every submitted task
ends with a terminal disposition — done, blocked, or retried — recorded in
state. Raising concurrency to "go faster" without a fresh probe converts
progress into contention, and the damage shows up as latency and errors long
before it shows up as a crash.

### 3. Define the worker scoping contract

Each worker receives exactly one scoped task with four parts: explicit inputs;
an explicit deliverable (a named file, function, or report); a verification
step; and the requirement that the task be independent with no shared mutable
state. Assign unique output names so two workers cannot collide by accident.
If two tasks must touch the same artifact, they are not independent —
serialize them one wave apart. The full contract, with a prompt template and a
per-worker checklist, is in `references/worker-contracts.md`.

### 4. Compose the worker prompt

Build every prompt from: one line of project context; the task's requirements
with values verbatim; interfaces and decisions from prior tasks the worker
cannot know; resolution of ambiguities the worker must not re-decide; the
standing doctrine it cannot read itself; and the expected report format.
Require the full report on disk and a one-line summary in the response. Keep
the prompt lean — pasting accumulated history into every dispatch overflows
the worker's context and buries the task. The worker never needs the whole
plan, only its slice.

### 5. Collect and verify each artifact

For every worker: check the completion status in its transcript, confirm the
deliverable exists, and run its verification check yourself. Record the outcome
as evidence — artifact plus check output — not as a status line. An empty
artifact is a failure even when the summary says success. The controller
verifies; the worker asserts. A worker that produced the wrong artifact
correctly is still a failure of scoping, so feed that back as a task-definition
problem, not a worker problem.

### 6. Retry bounded, with failure context

Retry with exponential backoff and jitter, bounded per task and per wave. On
each retry, feed the failure forward: what broke, what was tried, what is
different now. Distinguish transient contention from permanent failure before
mass retrying, so a throttle is not treated as death and a dead worker is not
retried forever. After the bound, mark blocked with evidence and move on.
Retry decisions are recorded; a retry that repeats the same attempt with the
same prompt is budget spent to learn nothing.

### 7. Tier capability to complexity

Route mechanical work — complete specifications, one or two files, single
fixes — to the cheapest capable tier. Route multi-file integration and
judgment to a standard tier. Route architecture, final review, and design to
the most capable tier. Escalate one tier for fix rounds after repeated
failures, and always pin the capability tier explicitly for delegated work.
Evaluate cost per turn count, not per unit price: a cheap tier that takes
several times the turns can cost more overall. File assignments, expected file
counts, and required judgment are the inputs to the tiering decision.

### 8. Lease shared resources

Maintain a lease registry for anything that cannot be shared concurrently:
exclusive locks, quotas, scarce capacity. Allocate least-busy-first; expire
leases with a sweeper so a dead worker's lease does not leak; expose liveness
so a fanout targets free capacity instead of guessing. Attach an identity to
every request so usage is attributable. Check capacity before the fanout, not
after the collision. The registry shape is in `references/worker-contracts.md`.

### 9. Budget the real cost curve

Parallelism has fixed and hidden costs: memory per worker including the host
process base, context ceilings, result volume, session and artifact growth,
and human review bandwidth. Keep a free-memory buffer; keep a retention policy
for worker artifacts and session stores; prefer more small workers over fewer
huge ones when context limits are tight. The machine staying responsive during
the run is part of the quality bar. Counting only per-unit spend and ignoring
review bandwidth is how a "fast" run ends with a review queue nobody can drain.

### 10. Integrate and report honestly

After collection, merge only verified outputs; resolve overlaps explicitly;
discard unverified fragments rather than merging them under pressure. Report
per-worker outcomes (N/M succeeded), what failed, and what was done about it.
State the actual final state, not the intended one. Read the actual outputs
before synthesis — aggregating from memory of instructions is how unverified
content enters a deliverable that gets called done.

**Exit gate.** Every fanout traces to a live probe; no pool ever exceeded the
cap; every submitted task has a recorded terminal disposition; every merged
fragment has a verified artifact behind it; the report states N/M and the
failure handling.

## When NOT to use

- The work is inherently sequential, or a single task — do it directly.
- The bottleneck is duration and continuity, not width — use `durable-goals`.
- The need is iterative refinement against a rubric, not parallel production —
  use `quality-loops`.
- Workers would edit shared state or the same artifact — decompose until the
  tasks are independent, or serialize the overlap.
- The authorization basis is unclear, or a task would require an interactive
  human-verification step — stop and hand back (`honest-fences`).

## References

- `references/worker-contracts.md` — the scoping contract, the prompt
  template, the per-worker verification checklist, the lease registry shape,
  the retry failure bundle, and the fanout report template. Read it before the
  first dispatch of a run.
- `durable-goals` — state, budgets, and resume for runs that span sessions.
- `quality-loops` — the judge and rubric machinery that grades output.
- `recon` — surface and machine facts; probe technique.
- `evidence-protocol` — how per-worker artifacts become verifiable claims.
- `self-evolving-skills` — recording fanout lessons for the next run.
