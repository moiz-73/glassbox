# Worker Contracts

Companion to `swarm-orchestration/SKILL.md`. Read this before the first
dispatch of a run, and again when a worker returns something you cannot
verify. Everything here is deliberately mechanical: a worker contract that
cannot be checked in isolation is not a contract.

---

## 1. The scoping contract

Every dispatched task must be expressible in four parts:

1. **Inputs** — the exact files, values, interfaces, and prior decisions the
   worker needs. Values are passed verbatim; the worker is never told to go
   read the plan.
2. **Deliverable** — one named output: a file, a function, or a report, with
   the name fixed at dispatch time.
3. **Verification** — the exact check that decides whether the deliverable is
   acceptable, runnable by the controller against the worker's output without
   re-running the worker's reasoning.
4. **Independence** — no shared mutable state with any other task, and unique
   output names. Two tasks touching one artifact are one task, or two tasks
   serialized a wave apart.

Rejection criteria, written before dispatch: what would make the deliverable
unacceptable? If the deliverable can be verified or rejected in isolation, the
scope is right. If two workers could plausibly edit the same output, the
decomposition is wrong.

---

## 2. Worker prompt template

Placeholders in angle brackets; fill every one. Keep the prompt lean — this
is the worker's entire world.

```
You are one worker in a parallel run. Do exactly this task; do not expand
it.

Project context: <one line; no history dumps>

Task: <verb + object, singular>

Deliverable: <exact output name>

Inputs: <exact inputs; values verbatim, files by name>

Interfaces already fixed: <decisions from prior tasks the worker cannot
know and must not re-decide>

Ambiguity resolution: <the reading to take, stated plainly>

Constraints: <the few that matter: style, size, allowed tools, limits>

Do not touch: <files and resources owned by other tasks>

Verification: after producing the deliverable, run:
  <exact check>
Include the observed output in your report.

Report format:
  status: done | blocked | failed
  deliverable: <name>
  verification: <check and observed result>
  notes: <at most three lines; one line if nothing unusual>
```

Rules that make the template work:

- The worker never sees the orchestrator's conversation, plan, or other
  workers' tasks. Everything it needs is in the prompt or in the named input
  files.
- The report is short; the artifact is the payload. A long narrative report is
  a smell that the task was underspecified.
- "Do not touch" is explicit. Workers respect scope when scope is named.
- One task per prompt. Bundled deliverables get partially done and cannot be
  verified item by item.

---

## 3. Per-worker verification checklist

Run this for every returned worker, before any integration:

- [ ] The worker reached a terminal status in its transcript.
- [ ] The deliverable exists at the declared name.
- [ ] The deliverable is non-empty and structurally plausible: expected
      sections, keys, or exports are present.
- [ ] The declared verification check was run by the controller, on the
      delivered artifact — not trusted from the worker's message.
- [ ] The check output confirms the task's acceptance criterion.
- [ ] The diff shows no files outside the worker's declared scope were
      modified.
- [ ] Overlaps with other workers' outputs are identified and resolved.
- [ ] The outcome is recorded as evidence with a timestamp: artifact name,
      check output, verdict.

An empty artifact, a mismatched name, or a check the worker never ran are all
failures regardless of prose. Record the verdict; do not summarize it away.

---

## 4. Retry failure bundle

A retry is a new dispatch with new information. It carries:

- the original task text, unchanged;
- what was produced, or the note that nothing was produced;
- the verification output that condemned the result;
- what has already been tried (one line per attempt);
- what must be different this time.

Bounded by default: a small number of attempts per task (three is a common
default), then blocked-with-evidence. Backoff is exponential with jitter, and
the wave as a whole gets a timeout. A retry that repeats the previous dispatch
with no new context is forbidden — it cannot produce a different outcome, and
it hides the real state.

---

## 5. Lease registry shape

For any exclusive resource — locks, quotas, scarce capacity — keep a registry
the dispatcher reads before every fanout:

```
leases
  resource_id:   <stable identifier>
  kind:          <exclusive | quota | capacity>
  holder:        <worker or task id holding it>
  acquired_at:   <timestamp>
  expires_at:    <timestamp>
  status:        <held | free | expired>
  affinity:      <what the resource is bound to, if anything>
```

Operating rules:

- Allocate least-busy-first; a worker waits rather than guesses.
- Every lease has an expiry; a sweeper returns expired leases to `free` so a
  dead worker cannot leak capacity.
- Expose a liveness signal per lease so the dispatcher can distinguish "busy"
  from "dead but held".
- Attribute usage to the holder; unattributed usage cannot be budgeted.
- Check free capacity before the fanout. After the collision is too late.

---

## 6. Fanout report template

Produced after integration; states the real outcome, not the intended one:

```
Run:            <run id, date>
Probe:          <measurement summary and derived cap>
Tasks:          <submitted> submitted | <done> done | <blocked> blocked |
                <retried> retried
Per task:       <task> -> <outcome> -> <artifact> -> <check result>
Integration:    <what was merged> | <what was discarded and why>
Retries:        <which tasks, attempts, what changed each time>
Open:           <unverified items, blockers, needed decisions>
Budget:         <spent and remaining in the tracked currencies>
```

An honest fanout report makes failures as visible as successes: a reader can
reconstruct which parts are verified, which failed, and what was discarded.

---

## 7. Wave planning worksheet

Before dispatch, write the plan down:

1. List the tasks; for each, mark its inputs, deliverable, check, and output
   name.
2. Draw the dependency edges. Tasks with no path between them may share a
   wave.
3. Group overlapping tasks so they land in different waves.
4. Order waves: independent first, then integration, then verification.
5. Size each wave against the measured cap; carry the overflow to the next
   wave rather than widening the pool.
6. Attach a timeout to every wave and a terminal disposition to every task.

The worksheet doubles as the integration plan: if you cannot say where a
worker's output goes, the task is not ready to dispatch.
