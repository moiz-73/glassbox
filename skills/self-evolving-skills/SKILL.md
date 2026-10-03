---
name: self-evolving-skills
description: >-
  Make a skill learn from every run instead of re-learning failures. Use before
  rerunning any recurring workflow: consult the skill's lessons, verified
  state, and run log; dedupe new failures by symptom; promote repeat evidence
  into rules; adapt parameters only under evidence thresholds and delta caps;
  keep state versioned with a changelog and backups; watch for drift between
  documentation and observed behavior; and recover memory after corruption.
  Not for one-off tasks, per-run durability (`durable-goals`), or quality
  iteration (`quality-loops`).
license: MIT
metadata:
  version: 1.0.0
---

# Self-Evolving Skills

A skill that runs twice should not pay the same learning cost twice. Most
agents are amnesiac: the process exits, the context compacts, the worker
rotates — and every cold start rediscovers the same traps. A self-evolving
skill treats memory as part of the artifact. Lessons accumulate, state stays
current, and each run leaves the next one smarter.

The mechanism is deliberately small: three files, one fixed lesson schema, and
a few gates. Memory that needs infrastructure gets abandoned; memory beside the
skill in plain files gets read automatically. The goal is the absence of
repeated failure: the same symptom costs you once, ever.

## Decision table

| Situation | Action | Read |
|---|---|---|
| Starting a run of a workflow done before | Read the memory triad before acting | Method 2 |
| A run just finished | Append the outcome, extract lessons, update state | Method 2 |
| The same failure appears a second time | Merge into the existing lesson; increment its evidence count | Method 3 |
| A lesson keeps recurring | Run the promotion checklist; turn it into a rule only if it passes | Method 4 |
| Tempted to retune a threshold | Apply the guarded-adaptation gate first | Method 5 |
| About to edit the skill or its state shape | Version, changelog, and back up before the patch | Method 6 |
| Observation contradicts the written state | Treat the state as wrong; fix and date it now | Method 7 |
| Two documents cover one capability | Declare one canonical; retire the other with a pointer | Method 8 |
| A memory file is corrupt or missing | Recover from a redundant store, then verify against reality | Method 9 |

## Golden rules

1. **Consult before, append after.** A lesson written but never read is
   decoration. The value of memory is realized only at the start of a run,
   when it still changes a decision.
2. **Dedupe by symptom; count evidence.** A recurrence increments a counter and
   a date instead of adding a near-copy. Noise hides the failure that keeps
   happening.
3. **One canonical source per capability.** Two "current" documents mean the
   next session consults a different truth depending on which it reads first.
4. **Never move a protected parameter from one observation.** Single noisy runs
   cause flapping and silently weaken the gates the skill exists to enforce.
5. **Version, changelog, and back up before patching.** A self-edit with no
   history and no rollback is a regression waiting for its trigger.
6. **The document must match the wire, and memory must be recoverable.** When
   observation contradicts the written state, the state is wrong; assume one
   memory file will eventually be corrupted, and design redundancy plus a
   loader that refuses to guess — that is what keeps the history alive.

## The method

### 1. Keep the memory triad beside the skill

Three plain files, each with one job:

- **lessons** — failures and their fixes, one entry per distinct symptom,
  deduped and evidence-counted.
- **state** — the current verified truth: interfaces, shapes, limits,
  versions, cadence, pinned identifiers, with dates.
- **run log** — an append-only, redacted record: one line per run with the
  outcome and a receipt.

Files live next to the skill so a cold session inherits them automatically.
Zero infrastructure is a feature: if reading memory costs a setup step, it will
not happen.

Quality bar: a fresh session with zero context reads the triad and immediately
knows the current truth and the known traps. The full shapes are in
`references/memory-systems.md`.

### 2. Consult before the run, append after it

At the start of every run, read the lessons and confirm none of the recorded
failure modes applies; read the state so today's work starts from verified
facts, not memory. At the end, do the same work in reverse: log the run
outcome, extract every failure into a lesson, and update state for anything
that changed. Confirm the run actually landed with an observable success
signal — "no error" is not a landing.

A run's log line should make the consult visible: what was checked and what
was found. If a session skipped the consult, that is itself worth recording,
because the next session should not repeat it.

### 3. Record lessons in a fixed schema; dedupe by symptom

One entry, one screen, machine-readable:

```
- id: <stable key>
  stage: <where in the workflow it happens>
  symptom: <observable, normalized for matching>
  root_cause: <known | unknown>
  fix: <exact change or action>
  verified_by: <the check that proved the fix>
  evidence_count: <n>
  first_seen: <date>
  last_seen: <date>
  status: open | patched | promoted
```

On recurrence, find the entry with the same stage and symptom and increment its
count and last-seen date. Do not create a second entry, and never delete
history: a vague lesson that caused the same failure twice should be rewritten,
with the rewrite visible. If the root cause is unknown, record the symptom,
what was tried, and mark it open — an honest unknown is worth more than a
plausible story.

### 4. Promote a lesson into a rule only at the threshold

A lesson is advice; a rule is a gate. Promotion is a deliberate act with a
checklist, not an automatic side effect:

- [ ] The symptom has recurred at least a few times (three is a common
      default), or a single occurrence had severe, unambiguous impact.
- [ ] The root cause is known, not merely correlated.
- [ ] The fix was verified by an executed check, not by narrative.
- [ ] The rule states a condition and an action, so a reader can tell when it
      applies and whether it fired.
- [ ] The rule does not weaken a safety gate, a budget, or a boundary rule
      (see `honest-fences`).
- [ ] The rule is written into the skill, versioned, and backed up before the
      patch; a changelog entry names the evidence.

### 5. Adapt parameters only under guard

Self-tuning is opt-in and default off. A parameter moves only when all of the
following hold: auto-evolution is enabled for it; the change is within its
per-step delta cap; the parameter is not on the never-change list; and the
evidence is either a successful run with a clear refinement or the same failure
repeating across several consecutive runs. Never weaken a gate from one data
point. A failed run produces a lesson and zero parameter changes.

The never-change list is what keeps adaptation safe: output conventions,
cadence, budget floors, safety gates, and the guardrails themselves. Every
proposed change is logged with its evidence before it is applied; the log
distinguishes proposed from applied. Full thresholds and the adaptation record
shape are in `references/memory-systems.md`.

### 6. Version the state; back up before patching

Give the state file a schema version and migrate deliberately when its shape
changes: old files are interpreted under their own version, never guessed at.
Every self-edit gets a changelog entry — what changed, why, the evidence, and
how to revert. Back up the current files before any patch, and keep the backup
until the change survives a run. The purpose is not ceremony: an unrecoverable
self-edit turns the skill's own evolution into an outage.

### 7. Watch for drift

External surfaces change: shapes, versions, limits, behaviors. When an
observation contradicts the written state, the state is wrong — fix it
immediately, date the correction, and record the drift as a lesson. Keep the
document executable as written: if a step no longer works, do not leave it
sitting next to current instructions. Mark superseded paths explicitly as
history, not as instructions, and prefer "to verify this, do X" over an
assumption that has stopped being true.

### 8. Supersede; never duplicate doctrine

Keep one canonical document per capability. A superseded document is retired
with a pointer to the canonical one — and, where a habit depends on the old
name, a compatibility alias for one release. Shared doctrine is referenced,
not copied: the moment two files describe the same procedure, they begin to
drift, and the next session inherits whichever version it reads first.

### 9. Recover memory without re-deriving history

Write memory atomically and with encoding discipline; load a critical file
with a parser that throws on corruption rather than silently defaulting to
empty, because an empty default overwrites good data on the next save. Keep
redundancy — the run log, backups, downstream artifacts — so any single file
can be lost. Recovery is a procedure, not an improvisation: find the most
durable store, reconstruct the state, then verify the recovered facts against
live reality before trusting them. Recovered data is a hypothesis until
re-observed.

**Exit gate.** A fresh session with zero context reads the triad, knows the
current truth and the known traps, and can continue the work correctly; a
corruption drill on any single memory file recovers without re-deriving history
from scratch; every rule and parameter change traces to dated evidence.

## When NOT to use

- A one-off task with no recurrence has nothing to remember — just do it.
- The problem is keeping one long run alive — that is `durable-goals`, whose
  state files serve the run, not the skill.
- The problem is iterating an artifact to a quality bar — that is
  `quality-loops`.
- The facts need verifying for a deliverable, not storing for a skill — use
  `evidence-protocol` and `recon`.
- The change would weaken a safety gate or a boundary — that is an
  `honest-fences` question, not a tuning decision.

## References

- `references/memory-systems.md` — the full playbook: file shapes, the lesson
  schema in detail, the dedupe algorithm, the promotion checklist, adaptation
  thresholds and delta caps, state versioning and migration, drift protocol,
  supersession, and the recovery drill. Read it when building a skill's memory
  or when a lesson needs promoting.
- `deep-reverse-engineering` — the evolve phase this skill formalizes.
- `durable-goals` — state that keeps one long run alive.
- `quality-loops` — bounded iteration toward a quality bar.
- `evidence-protocol` — the evidence grades lessons and rules carry.
- `honest-fences` — the boundaries self-edits must never cross.
