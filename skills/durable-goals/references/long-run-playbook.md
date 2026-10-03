# Long-Run Playbook

Companion to `durable-goals/SKILL.md`. Read this when setting up a run that
will outlive a session, when a guard fires, or when a resume feels ambiguous.

A durable run is built from four artifacts and five mechanisms. The artifacts
hold the truth; the mechanisms keep the truth trustworthy: atomic writes,
append-only history, live guards, three-currency budgets, and idempotent
re-entry.

---

## 1. The four artifacts

### 1.1 Brief

The immutable goal. If the goal changes, write a new version; never edit the
old one in place, because "what were we trying to do" must remain answerable.

### 1.2 State

The compact snapshot a resume reads first. A workable field sketch (fields,
not a real file):

```
brief
  objective:          one line
  completion:         list of checkable criteria
  non_goals:          list
  constraints:        list
  version:            integer

state
  schema_version:     integer
  status:             running | paused | blocked | complete
  milestone:          current milestone id
  next_action:        the single next step, concrete
  attempts:           map of step -> distinct attempt count
  blocked:            list of {item, obstacle, evidence, resume_path}
  budgets:
    steps_used:       integer
    steps_limit:      integer
    started_at:       timestamp
    elapsed_limit:    duration
    spend_used:       number
    spend_limit:      number
  heartbeat_at:       timestamp
  updated_at:         timestamp

checkpoints/
  state-<n>.snapshot     rotated, bounded, newest known
```

Rules that make the sketch real:

- `next_action` is a single concrete step, not a phase name. A resume should
  never need to re-derive it.
- `attempts` counts *distinct* attempts; a counter above the small default
  forces the blocked path instead of a silent retry.
- `started_at` is written once and never touched; duration accounting depends
  on it.
- `schema_version` lets a future reader interpret the file under the shape it
  was written with.

### 1.3 Ledger

Append-only, one event per line, timestamped:

```
{"event":"milestone","at":"<timestamp>","detail":"<what>","evidence":"<ref>"}
{"event":"state_change","at":"<timestamp>","detail":"<from> -> <to>"}
{"event":"spend","at":"<timestamp>","detail":"<units>","evidence":"<ref>"}
{"event":"guard","at":"<timestamp>","detail":"<guard>: <verdict>"}
{"event":"blocker","at":"<timestamp>","detail":"<obstacle>","evidence":"<ref>"}
{"event":"checkin","at":"<timestamp>","detail":"<path>"}
```

Never edit or delete an entry. If an entry was wrong, add a correction entry
that references it. Rotate derived views (dashboards, summaries), never the
ledger itself.

### 1.4 Checkpoints

A bounded number of prior state snapshots, rotated. They exist for one reason:
rollback. When a change makes things worse, the best previous snapshot is
restored rather than reconstructed from prose.

---

## 2. Atomic write protocol

1. Serialize the complete new state.
2. Write it to a sibling temporary file.
3. Flush and close the temporary file.
4. Rename it over the target path, replacing it in one step.
5. Append the ledger entry describing the change.
6. Rotate checkpoints, dropping the oldest beyond the bound.

The ordering matters: the rename makes the new state visible atomically, and
the ledger entry lands only after the state it describes is durable. A crash
between steps 4 and 5 loses one ledger line but never corrupts state; a crash
between 2 and 4 loses only the uncommitted update. On startup, a loader that
finds an unreadable state file must fail loudly and reconstruct from the
ledger and checkpoints — never default to an empty state, which would look
like "nothing done" and invite a full re-run.

---

## 3. Heartbeat and watchdog

Stamp `heartbeat_at` on every checkpoint. Evaluate guards at every resume and
before every milestone, not on a private schedule — a guard evaluated only at
the end discovers failure too late.

| Condition | Default trigger | Prescribed action |
|---|---|---|
| Healthy | Heartbeat within the expected window; at least one milestone event since the last check | Continue from `next_action` |
| Stale heartbeat | No checkpoint within a small multiple of the normal interval | Diagnose the stall; resume once; if it repeats, declare blocked |
| Same-step loop | The same action appears repeatedly with no new input or evidence | Change approach or escalate a capability tier; never repeat unchanged |
| No progress | A handful of consecutive checkpoints with no milestone movement | Re-plan, narrow scope, or report; do not continue the same way |
| Budget low | Any currency crosses its warning fraction | Finish the current atomic step; prepare the handoff |
| Budget exhausted | Any currency reaches its limit | Checkpoint, pause, report partial results |
| Missing or torn state | State unreadable, absent, or schema-mismatched | Recover from ledger plus newest checkpoint; record the recovery |

Thresholds are defaults, not constants. The normal checkpoint interval defines
"expected"; tune the multiples from observed runs, keep the guards themselves
on a never-change list, and record every adjustment. A fired guard always
produces an observable behavior change plus a ledger entry; otherwise it was
noise.

---

## 4. Three-currency budget accounting

| Currency | Measured as | Exhaustion behavior |
|---|---|---|
| Steps / actions | Count of dispatched actions, reset never; carried across resumes | Pause and hand off |
| Wall-clock | Now minus `started_at`, carried across resumes | Pause and hand off |
| Spend | Approximate units consumed, attributed to the step that spent them | Pause and hand off |

- Advertise remaining budget in every check-in and at every context boundary,
  so pacing does not depend on reading internal counters.
- A budget stop is never a completion and never a failure; it is a pause with a
  deterministic handoff artifact.
- Do not silently degrade quality to conserve budget. If quality must drop,
  that is a decision for the human, recorded in a check-in.
- On resume, keep the original `started_at` and cumulative counters. Resetting
  either makes the run look younger and poorer than it is.

---

## 5. Deterministic resume checklist

Run this in order; running it twice must change nothing after the first pass.

1. Read `state`. Verify `schema_version`; if unreadable, recover from the
   ledger and newest checkpoint and record the recovery.
2. Re-read the brief's completion criteria verbatim. Do not paraphrase from
   memory.
3. Evaluate the watchdog and record the guard verdict as a ledger event.
4. Reconcile counters with the ledger; fix the state, not the ledger, if they
   disagree.
5. Review blocked items: clear only those whose unblock condition is now
   observably met.
6. Confirm `next_action` is still correct given the above; update it if
   evidence requires.
7. Skip every step whose output exists and passes its own check. Completed
   milestones are never re-dispatched — this is the most expensive failure in
   long runs.
8. Continue from `next_action`, writing state before or alongside each step.

---

## 6. Check-in template

A check-in is a file, not a prompt. It is written at safe boundaries and read
by a human asynchronously.

```
run:            <goal id / objective, one line>
status:         <running | paused | blocked | complete>
milestone:      <current milestone>
since_last:     <what was done, each with an evidence reference>
decisions:      <choices made and why; reversible ones flagged>
budget:         <steps remaining | time remaining | spend remaining>
next:           <the next planned actions>
needs_human:    <question + default if no reply arrives>
hard_gates:     <irreversible actions awaiting approval, or none>
```

Guidelines: keep it to the template — a check-in that restates the log is
noise. State a default action for every question so the run can continue if no
reply arrives. Flag every irreversible operation before it happens; "preview,
then wait" is the mechanism, and it is part of the design rather than a pause
in it.

---

## 7. Completion checklist

Before marking `complete`, all of the following must hold:

- [ ] Every completion criterion maps to a specific check (command, probe, or
      artifact inspection).
- [ ] Each check was run fresh in this session, full output read, failures
      counted.
- [ ] Claims were verified against the artifacts, not against recollection of
      producing them.
- [ ] A separate context reviewed the result and its record exists.
- [ ] The invariant check passed: re-running the checks yields the same
      verdict.
- [ ] The ledger contains the completion event with evidence references.
- [ ] Anything unverified is labeled as such, never presented as done.

If any box is unchecked, the honest status is `paused` or `blocked`, not
`complete`.

---

## 8. Idempotency patterns

- **Deterministic names.** Output names derive from the task's identity, so a
  retry overwrites the same logical output instead of minting a new variant.
- **Existence plus check equals skip.** A step whose output exists and passes
  its own check is not re-run.
- **Rename to consume.** Mark consumed inputs by renaming, never deleting.
- **Counters from artifacts.** Iteration numbers come from listing existing
  outputs, not from memory.
- **Duplicate drill.** As a setup test, dispatch the same step twice and
  confirm the second run changes nothing observable.

---

## 9. Setup checklist for a new durable goal

- [ ] Brief written with checkable completion criteria and non-goals.
- [ ] State initialized with schema version, budgets, and first action.
- [ ] Atomic write path tested by killing the process mid-write.
- [ ] Ledger created; first entries appended.
- [ ] Guard thresholds chosen from defaults; never-change list recorded.
- [ ] Check-in cadence chosen; template copied.
- [ ] Idempotency drill run on the first repeatable step.
- [ ] Resume drill: stop, start a fresh session, resume from files alone.
