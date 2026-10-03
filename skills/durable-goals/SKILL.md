---
name: durable-goals
description: >-
  Run an autonomous goal for work that spans sessions or must survive restarts.
  Use when work must survive context compaction, crashes, or session
  restarts; when a run spans many milestones; when watchdogs, budgets,
  check-ins, or blocked outcomes are needed; or when completion must be proven
  from artifacts.
  Covers durable state, atomic writes, append-only ledgers, guard conditions,
  three-currency budgets, deterministic resume, parked decisions, and
  idempotent re-execution. Not for single-session tasks, parallel fanout
  (`swarm-orchestration`), or quality loops (`quality-loops`).
license: MIT
metadata:
  version: 1.0.0
---

# Durable Goals

A durable goal is work that outlives one conversation: a migration, a long
build-out, a research program, a release train. The governing insight is that
the agent is amnesiac and the filesystem is not; every mechanism here exists to
make that handoff trustworthy.

## Decision table

| Situation | Action | Load |
|---|---|---|
| Starting work that will span sessions | Write the brief with completion criteria; initialize the state file | Method 1 |
| About to write state | Use the atomic write protocol | Method 2 |
| A milestone or spend event happens | Append it to the ledger | Method 3 |
| Resuming after a crash or compaction | Run the watchdog, then resume from the next action | Methods 4, 6 |
| Work feels busy but nothing is landing | Evaluate the guard conditions | Method 4 |
| A budget approaches its limit | Checkpoint, pause, hand off | Method 5 |
| An attempt failed | Retry with new context, then declare blocked with evidence | Method 7 |
| A decision needs a human | Write a check-in; keep running unless it is a hard gate | Method 8 |
| Tempted to declare done | Run the completion gate | Method 9 |
| A step may run twice | Make it idempotent before dispatching | Method 10 |

## Golden rules

1. **The filesystem is the memory; context is a cache.** Compaction and crashes
   wipe context, so anything remembered only in-context will be re-learned,
   re-done, or silently dropped.
2. **Write state before or alongside the work.** A write that comes after the
   work is skipped by the exact crash it was meant to survive.
3. **Append, never rewrite, history.** Mutable state answers where we are; only
   the ledger can answer how we got here and be trusted as evidence.
4. **Bounded attempts, then blocked with evidence.** A fourth identical retry
   burns budget without producing information; blocked is a legitimate,
   reportable outcome.
5. **Budgets have three currencies: steps, wall-clock, and spend.** Any one can
   exhaust while the others look healthy, so all three are tracked and
   advertised.
6. **Resume must be idempotent.** Running the resume path twice changes
   nothing, and completed milestones are never re-dispatched.
7. **Park decisions; do not block the loop.** A long run that stops for every
   question never finishes; a run that never asks can act irreversibly
   unobserved.
8. **Completion is a verified claim.** The agent's own sense of done is not
   evidence; re-run the checks and record the output.

## The method

### 1. Put state outside the context window

Keep four artifacts as files next to the work:

- **brief** — the immutable goal: objective, completion criteria, non-goals,
  constraints. Never edited mid-run; a change creates a new version.
- **state** — the compact snapshot: status, current milestone, next action,
  counters, budget remaining, blockers.
- **ledger** — append-only events: milestones, state changes, spend, guard
  firings, blockers.
- **checkpoints** — a bounded set of rotated snapshots that allow rollback.

Quality bar: a fresh agent with no conversation history reconstructs "where are
we, what is next, what is blocked" from these files alone, without asking the
human. The field sketch is in `references/long-run-playbook.md`.

### 2. Write atomically

Write the full new state to a temporary file, flush it, then rename it over the
target; append the ledger entry after the rename succeeds; rotate a bounded
number of prior snapshots. A crash at any instant then leaves either the old
state or the new state intact, never a torn file. Editing live state in place
is the defect this rule exists to prevent.

### 3. Keep an append-only ledger

One event per line, timestamped, never edited or deleted. Record milestones,
state changes, spend events, guard firings, and blockers. Summaries are derived
from the ledger, not written over it. Ledger plus snapshots plus version
history answer every "what happened, what did it cost, what evidence exists"
question. Include failures; a ledger that records only successes is a story,
not an audit trail.

### 4. Run heartbeat and watchdog guards before every milestone

Stamp a heartbeat on every checkpoint. At every resume and before every
milestone, evaluate distinct guard conditions and act:

| Condition | Meaning | Action |
|---|---|---|
| Healthy | Heartbeat fresh; progress since last check | Continue from the next action |
| Stale heartbeat | No checkpoint within the expected window | Re-anchor: diagnose, then resume or declare blocked |
| Same-step loop | One step repeats with no new input | Change approach or escalate; never repeat unchanged |
| No progress | Several checkpoints with no milestone movement | Re-plan; narrow scope; report |
| Budget low or exhausted | A currency is near its limit | Checkpoint, pause, hand off |
| Missing or torn state | State unreadable or absent | Re-initialize from the ledger, not from memory |

Firing a guard is itself a ledger event. A guard that only logs and never
changes behavior is decoration.

### 5. Budget in three currencies

Track steps or actions, wall-clock duration, and approximate spend. Advertise
remaining budget at every context boundary so the run paces itself. On
exhaustion: checkpoint, pause, summarize blockers and partial results, and
report. Never convert a budget stop into a completion, and never restart the
clock on resume — that makes the accounting lie.

### 6. Resume deterministically

On resume: read the state file, re-read the immutable brief's completion
criteria verbatim, run the watchdog, then continue from the first recorded next
action. Do not restart completed milestones. Skip any step whose output already
exists and passes its own check. Deterministic resume is what lets a compaction
in the middle of a task resume mid-task, not at the task's start.

### 7. Treat blocked as a first-class outcome

Give any failure at most a small number of distinct attempts — three is a
common default — then declare it blocked. A blocked record names the obstacle,
the evidence, the approaches tried, and a precise resume path. Then move to the
next workable item. Stalling silently and reporting success to avoid admitting
a block both destroy the run's ability to report honestly.

### 8. Check in asynchronously

Write a check-in artifact at safe boundaries: after milestones, before any
irreversible operation, and on budget stops. It states what was done, decisions
taken, what is next, and anything needing human judgment. Keep running unless
the check-in flags a hard gate — irreversible actions (sending, posting,
deleting, paying, publishing) wait for explicit approval by construction. Never
block the loop on an interactive question mid-run; a weeks-long goal that stops
for every decision never finishes.

### 9. Enforce completion discipline

Mark complete only when every completion criterion is independently verifiable
with an executed check and captured output. Re-run verification immediately
before the final state, obtain review from a separate context, and record the
invariant check. Another party must be able to reproduce the completion claim
by re-running the recorded commands. Self-review as the final gate, and "tests
pass therefore requirements are met", are the two most common false
completions.

### 10. Make re-execution idempotent

Name outputs deterministically; make each step's output discoverable and
checkable; if the output exists and passes its check, skip the step. Derive
iteration numbers from existing artifacts, not from memory. Duplicate
execution — from a retry, a resume, or a second entry point — must be harmless,
and parallel re-entry must not double-apply a step.

**Exit gate.** A fresh session can resume from files alone; a kill-and-restart
drill loses no work and duplicates none; the ledger survives every write path;
every completion criterion has a recorded check.

## When NOT to use

- The task fits in one session and has no milestones, budgets, or restart risk
  — just do it, and use `evidence-protocol` for the completion claim.
- The problem is parallel workers, not duration — use `swarm-orchestration`.
- The problem is iterative quality against a rubric — use `quality-loops`.
- The authorization basis is unclear or a required step is an interactive
  human-verification wall — stop and hand back to a human (`honest-fences`).

## References

- `references/long-run-playbook.md` — the state field sketch, atomic write
  protocol, ledger schema, guard thresholds, budget accounting, resume
  checklist, and check-in template. Read it when setting up a durable run or
  when a guard fires.
- `flow-modeling` — crash-safe state and idempotency mechanics at the flow
  level.
- `swarm-orchestration` — running many workers safely alongside a durable goal.
- `quality-loops` — bounded iteration toward a quality bar.
- `self-evolving-skills` — recording what the run learned for the next one.
- `evidence-protocol` — turning completion criteria into verifiable claims.
