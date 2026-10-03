# Resilience Patterns — field manual

Long-form companion to `flow-modeling/SKILL.md`. Read it when hardening a
flow for production: it carries the tables, procedures, and drills behind the
skill's method.

Contents:

1. Failure taxonomy and reactions
2. Retry loop construction
3. Capacity governor
4. Backpressure and queue law
5. Gates that actually gate
6. Rate budgets and streak aborts
7. Crash-safe run state
8. Deadline and reset clocks
9. Artifact lifecycle
10. Verification drills

---

## 1. Failure taxonomy and reactions

Classify every failure before choosing a reaction. One behavior per class,
with a counter per class so the run report can show what happened.

| Class | Signature | Reaction | Counter |
|---|---|---|---|
| Contention | A unit is busy or racing | Switch unit immediately; no penalty | switches |
| Shared throttle | A common gate engaged across units | Global backoff with jitter | throttle events |
| Hard limit | A real ceiling reached | Stop the lane; do not hammer | stops |
| Authorization failure | Credential rejected | Refresh once and retry; if it still fails, disable the unit | disabled units |
| Outage | Platform-wide degradation | Pause the lane; keep one canary probe | pauses |
| Silent failure | Success-shaped response, no effect | Treat as failure; re-probe once with fresh state | re-probes |

A blanket retry policy is a way to hide all six classes behind one symptom.
Two mistakes recur: treating a shared gate as a per-unit failure (and
disabling every unit), and treating an outage as contention (and racing it).
Both are prevented by one question — does the failure move when the unit
changes?

## 2. Retry loop construction

- Bound attempts. Three distinct attempts is the default; a fourth identical
  attempt is budget arson.
- Carry failure context forward: each retry knows what broke and what was
  already tried. A retry without new information is just load.
- Windows and budgets: cap attempts per task, per wave, and per run window.
- On the bound, mark the item blocked with evidence — what was tried, what
  happened, what would unblock it — and move on.
- Count retries per failure class; the class with the most retries is where
  the next fix goes.

Backoff discipline: exponential with jitter for shared gates; no penalty for
unit switches; immediate stop for hard limits. Additive increase or aggressive
retry against a soft ceiling is how a quiet limit becomes a defensive
response.

## 3. Capacity governor

Discover the soft ceiling before tuning anything.

1. Sweep concurrency levels with a fixed workload. For each level, record
   throughput, median latency, tail latency, and error count.
2. Find the level where throughput stops rising or tails start climbing; that
   is the operating ceiling, not the advertised one.
3. Implement additive increase and multiplicative decrease: add one unit per
   sustained run of successes, halve on contention, with a hard cap at the
   measured ceiling.
4. Verify the governor gates: sweep again and confirm throughput plateaus.
   Growth without bound means the gate is not working; collapse means the
   decrease step is too slow.
5. Treat bursts of contention as a soft signal: halve, then probe. Racing a
   pool-bound system doubles load and worsens tail latency — a measured net
   loss.

Sweep template fields: level, concurrency, throughput, median, p95, errors,
verdict. Store the sweep with the code; it doubles as the regression test for
the gate.

## 4. Backpressure and queue law

- Bound every queue. The bound is a design decision, not a default.
- Overflow policy: rejecting the newest request is usually kinder than
  stranding the oldest, because the oldest have already waited and the newest
  callers can adapt. Choose deliberately and record the choice.
- Per-unit in-flight limits: where upstream treats one unit as single-flight,
  parallel calls on that unit queue behind the scenes and turn into tail
  latency. Parallelism must come from distinct units.
- Metrics: queue depth, wait time, rejection count. These are first-class,
  not debug output.
- Every submitted item gets a terminal disposition — done, blocked, or
  retried. Items that vanish when a queue is dropped are silent failures.

## 5. Gates that actually gate

A gate is any condition that bounds concurrency, attempts, or consumption.
Gates fail in a characteristic way: a condition that starts already satisfied
makes the gate always-true, so the cap silently does nothing.

Verification procedure:

1. Write the gate in its strict form: the limit check must be evaluated
   against the current count, and the counter must be incremented and
   decremented on every entry and exit path.
2. Sweep past the cap deliberately. The observed throughput must plateau at
   the cap, never exceed it.
3. Keep the sweep as a regression test; run it after every gate edit.
4. Re-check gates that live in multiple code paths; a gate that works in one
   path and no-ops in another is the same defect wearing a disguise.

Evidence to store with the gate: sweep script, output, date, cap value. A cap
without a sweep is a comment.

## 6. Rate budgets and streak aborts

- Pace with random jitter, never a fixed cadence. Fixed cadence is both
  fragile and impolite.
- Enforce per-address and per-window caps conservatively; leave headroom for
  interactive or canary operations.
- Streak abort: after a small number of consecutive throttle-class failures,
  stop the run and exit with a distinct code. Continuing against a dead
  window wastes budget and deepens the throttle.
- Separate transient races from throttle-class failures. A transient retry is
  normal; counting it as a throttle trips the abort early. Count each class
  with its own counter.
- Stop entirely on repeated interactive steps and route them to a human.
- Canary probes cost quota; budget them. A canary that consumes scarce quota
  during a campaign is part of the problem.

Run report fields: operations attempted, per-class failure counts, streak
count at exit, exit code, quota consumed, next reset epoch.

## 7. Crash-safe run state

| Rule | Why |
|---|---|
| Write full state to a temp file, then rename over the target | A crash mid-write leaves the previous state intact |
| Keep an append-only ledger beside the snapshot | The snapshot says where we are; the ledger says how we got here |
| Loaders throw on corruption | A silent empty-default load overwrites good state with nothing |
| Back up before every overwrite | Recovery needs a source, and overwrites are the risk moment |
| Status commands are read-only | A status call that mutates counters corrupts the record |
| One pause file is the single source of truth | Competing state files drift and resume does double work |
| Compute targets from the ledger, not from memory | Resume after compaction must not depend on recollection |

Corruption drill: inject a byte-order mark or truncation into the state file;
the loader must throw; restore from backup must succeed. Run the drill after
any change to serialization or load paths.

Kill-and-resume drill: kill the process mid-write and mid-job, restart, and
verify no loss and no duplicate side effects. A resume that starts over is
not crash-safe.

## 8. Deadline and reset clocks

Model every clock the flow depends on:

| Clock | Reset behavior | Pause rule |
|---|---|---|
| Windowed quota | Resets on a fixed epoch | Sleep to reset plus jitter |
| Subscription renewal | Renews on a date | Act before the deadline, not after |
| Trial period | Expires once | Track end date; plan the transition |
| Cooldown | Lifts after a quiet period | Wake early via canary |
| Money obligation | Value lasts until period end | Cancel early enough, use value fully |

Discipline:

- On exhaustion, pause until the next reset epoch plus jitter. Hourly retries
  against a daily quota are pure waste.
- Keep the pause in a restart-safe file; a restart must not forget the pause.
- Let a low-frequency canary clear the pause early when the limiting
  condition lifts, and re-arm the canary after each cycle.
- Track money clocks in the same table as quota clocks; a missed renewal
  deadline is a deadline failure like any other.

## 9. Artifact lifecycle

Pipeline stages, in order:

1. **produce** — the remote side creates an artifact under a run identifier.
2. **transfer** — move it across the boundary; encrypt when the boundary is
   untrusted (`AES-GCM` for the payload, `RSA-OAEP` to wrap the key).
3. **collect** — walk the real layout; never assume a flat directory.
4. **decrypt** — at the trusted end only; delete plaintext temps after.
5. **merge** — idempotently, guarded by a seen-set keyed on artifact
   identity.
6. **mark consumed** — rename, never delete.

Failure classification: a run that produced no artifact is a production
failure, counted as such — not as a throttle and not as noise. Replaying a
collection must produce zero additional merges; test it by replaying.

## 10. Verification drills

- [ ] Kill the process mid-job; resume shows no loss, no double work.
- [ ] Run the double-execution test; no duplicate side effects.
- [ ] Sweep every gate; throughput plateaus at the cap.
- [ ] Inject corruption into state; loader throws; backup restores.
- [ ] Exhaust a quota; the pause survives restart and wakes early via
      canary.
- [ ] Replay artifact collection; zero additional merges.
- [ ] Review per-class failure counters against the taxonomy; every class has
      a reaction and a count.

When all drills pass, the flow is ready to leave the bench — and the drill
output, not the code, is the evidence.
