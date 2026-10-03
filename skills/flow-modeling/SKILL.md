---
name: flow-modeling
description: >-
  Model an external flow as a state machine and run it resiliently. Use when a
  multi-step flow must be automated, failures recur under blanket retries,
  leases and sessions have lifetimes, operations can double-execute, a run must
  survive process death, or quotas reset on a schedule. Covers states and
  transitions, retry taxonomy, idempotency and nonces, capacity governors,
  backpressure, crash-safe state, artifact collection, and deadline clocks.
  Not for surface recon (`recon`) or protocol decoding (`protocol-cartography`).
license: MIT
metadata:
  version: 1.0.0
---

# Flow Modeling

An external flow is anything with states you do not own: a checkout sequence,
a deployment pipeline, a multi-step provisioning process, a conversational
session. This skill turns observed runs into a state machine, then hardens the
machine for real operation — classified retries, replay safety, bounded
capacity, crash-safe state, and clocks that reset on a schedule. The guiding
rule is simple: every failure class gets its own behavior, and every piece of
durable state lives in a file, not in a context window.

## Decision table

| Situation | Action | Load |
|---|---|---|
| A multi-step external flow must be automated | Derive the state machine from observed runs | Method 1 |
| A per-context resource has a lifetime | Inventory the lease; run a restart drill | Method 2 |
| Failures recur under blanket retries | Classify before retrying; one behavior per class | Method 3 |
| Operations can be replayed by retries or workers | Fresh nonces; idempotency keys or seen-sets | Method 4 |
| A soft capacity ceiling shapes throughput | Discover it with a sweep; govern additively | Method 5 |
| Demand can exceed a bounded upstream | Bound queues; enforce per-unit in-flight | Method 6 |
| A run must survive process death | Atomic state writes plus an append-only ledger | Method 7 |
| Results are produced remotely and must be gathered | Define the artifact lifecycle; collect idempotently | Method 8 |
| Quotas or renewals reset on a clock | Model the clocks; pause to the reset | Method 9 |
| Any cap is load-bearing | Prove the gate gates with a concurrency sweep | Method 10 |
| Operating against per-window limits | Rate budget with jitter; streak abort | Method 11 |

## Golden rules

1. **Classify failures before retrying.** A uniform retry policy hides six
   failure classes behind one symptom, and hammering a defensive system turns
   an authorized run into an incident.
2. **State lives outside the context window.** Context dies at compaction and
   crashes take processes with it; files with atomic writes survive both.
3. **One source of truth for pauses and progress.** Two competing state files
   drift apart, and resume then does double work.
4. **Consumed artifacts are marked, never deleted.** Renaming proves
   consumption and keeps the audit trail; deletion destroys both.
5. **Gates must be swept.** A gate that has never been stress-verified is a
   comment; a silently disabled cap floods upstream and looks like an outage.
6. **Bound everything: queues, attempts, cycles, budgets.** Unbounded
   structures convert recoverable errors into stalls.
7. **Resume must be idempotent.** Crash-safe does not mean "it usually
   continues"; it means running resume twice changes nothing.
8. **Never repeat a recorded failure.** Consult the lesson store before a
   run, and append what changed after it (`self-evolving-skills`).

## The method

### 1. Derive the state machine from observed runs

1. Map states, guards, and terminal outcomes from observations, not
   imagination; each state is something you can point at in a capture.
2. Choose persisted fields that represent each state and transition; the
   diagram must survive a process restart. Every state maps to a field and a
   log line.
3. Log every transition with its trigger and timestamp, so a failure can be
   reconstructed without guesswork.
4. Define resume entry points: which states can be re-entered safely, and
   what a resume must skip because it is already done.

Exit gate: a state diagram that maps one-to-one onto persisted fields and log
lines; an operator can tell from the files which state the run is in.

### 2. Inventory leases and session lifecycles

1. Find the lease object: identifier, affinity (what it is bound to),
   time-to-live, and renewal mechanism.
2. Persist lease identifiers so a process restart can re-adopt live
   resources.
3. Test survival semantics explicitly: restart mid-job and record what
   rehydrates and what is lost.
4. Plan re-acquisition and migration for expiry: what a new lease must carry
   forward, and which jobs must start over.

Exit gate: a restart drill that demonstrates job survival or documents
precisely what is lost. Lease state lives in a file on durable storage, never
only in memory on a temporary host (`durable-goals` covers long-run state;
`credential-hygiene` covers session material).

### 3. Build the retry taxonomy

Classify first, then act. One behavior per class, with counters:

| Class | Meaning | Reaction |
|---|---|---|
| Contention | A unit is busy | Switch to a different unit immediately, no penalty |
| Shared throttle | A common gate engaged | Global backoff with jitter |
| Hard limit | A real ceiling reached | Stop; do not hammer |
| Authorization failure | The credential is dead or stale | Refresh once and retry; if it still fails, disable that unit |
| Outage | The platform is degraded | Pause the lane; keep one canary probe |
| Silent failure | A success-shaped failure | Treat as failure; re-probe before continuing |

A blanket retry policy hides all six classes behind one symptom. Count
occurrences per class and review the counters after every run; they tell you
which fix matters next.

### 4. Enforce idempotency and nonce discipline

1. Mint a fresh nonce or one-time parameter per attempt. Never reuse one.
2. Use idempotency keys where the system supports them; a seen-set where it
   does not.
3. Mark consumed artifacts by rename, never by deletion.
4. Test by double-execution: run the same operation twice and prove no
   duplicate side effects.

Exit gate: replay-safe behavior demonstrated by an intentional double-run.

### 5. Discover and govern capacity

Measure the ceiling with a concurrency sweep before tuning anything: record
throughput and tail latency per level. Then implement additive increase with
multiplicative decrease — grow slowly under sustained success, halve on
contention — with a hard cap at the measured ceiling. Verify the governor
actually gates by sweeping again and confirming throughput plateaus instead
of collapsing or growing without bound. The detailed procedure is in
`references/resilience-patterns.md`.

### 6. Apply backpressure and queue law

1. Bound every queue. No unbounded buffers, ever.
2. Choose the overflow policy deliberately; rejecting the newest request is
   usually kinder than stranding the oldest.
3. Enforce per-unit in-flight limits where upstream treats a unit as
   single-flight. Parallelism comes from distinct units, not from parallel
   calls on one.
4. Expose queue depth and rejection counts as first-class metrics.

### 7. Keep run state crash-safe

1. Write state atomically: full state to a temp file, then rename over it.
2. Keep an append-only ledger of events alongside the compact snapshot.
3. Make one file the single source of truth for long pauses; compute targets
   dynamically from the ledger.
4. Loaders must throw on corruption rather than defaulting to empty. Write a
   backup before every overwrite. Status commands are read-only.

### 8. Define the artifact lifecycle

1. Write the pipeline down: produce, transfer, collect, decrypt, merge, mark
   consumed.
2. Discover the real artifact layout by walking directories; never assume a
   flat path.
3. Make the collector idempotent with a seen-set, so a replay cannot
   double-merge.
4. Classify failed runs by "no artifact produced", not by log noise.

Exit gate: replaying the same collection produces zero additional merges.

### 9. Model deadline and reset clocks

1. Model every clock: renewal dates, quota reset epochs, trial end,
   cooldowns.
2. On exhaustion, pause until the next reset epoch plus jitter — never short
   retry loops against a daily budget.
3. Keep the pause in a restart-safe file that a canary can clear early if the
   limit lifts.
4. Track money clocks explicitly; ending an obligation may still leave value
   available until the period ends.

Exit gate: a clock table, plus a pause mechanism that survives restarts and
can wake early.

### 10. Prove gates actually gate

Write gates in the strict form and verify every one empirically. The classic
defect is a condition that starts already satisfied, making the gate silently
always-true — the cap does nothing, and upstream sees a flood. A concurrency
sweep must show throughput plateauing at the cap. Keep the sweep as a
regression test and re-run it after any gate edit. Details and a sweep
template are in `references/resilience-patterns.md`.

### 11. Set rate budgets and streak aborts

1. Pace operations with random jitter, never a fixed cadence.
2. Enforce per-address and per-window caps conservatively.
3. Abort the run after a small number of consecutive throttle-class failures,
   exiting with a distinct code instead of hammering a dead window.
4. Separate transient races from throttle-class failures so normal retries
   are not miscounted; stop entirely on repeated interactive steps and route
   them to a human.

**Exit gate.** Kill-and-resume drill shows no loss and no double work; a
double-execution test shows no duplicates; every cap has sweep evidence; the
pause file survives a restart and wakes early correctly.

## When NOT to use

- You still need surface, protection, or quota facts — start with `recon`.
- The wire contract itself is unknown — use `protocol-cartography` first.
- The task is one direct call with no states, limits, or replay risk — make
  the call.
- Authorization is unclear or the flow needs an interactive step: stop and
  hand back to a human.

## References

- `references/resilience-patterns.md` — failure taxonomy, capacity governor,
  backpressure law, gate sweeps, rate budgets, crash-safe state, clock
  tables, artifact lifecycle. Read it when hardening a flow for production.
- `recon` — supplies the facts this model is built from.
- `protocol-cartography` — supplies the contract the flow is made of.
- `durable-goals` — the doctrine for runs that outlive a single process.
- `self-evolving-skills` — how run lessons persist between engagements.
