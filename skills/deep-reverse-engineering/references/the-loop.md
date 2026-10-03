# The Loop — full playbook

This is the long-form companion to `deep-reverse-engineering/SKILL.md`. Read it
when you are running an engagement end to end, or when a phase is resisting you.

The loop is a cycle, not a line. Verification failures send you back to the
model; model failures send you back to perception. That is normal. What is not
normal — and not allowed — is skipping forward with a weak phase to look fast.

```
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             │
  0. Scope ──▶ 1. Perceive ──▶ 2. Model ──▶ 3. Execute ──▶ 4. Verify
                   ▲               ▲                          │
                   │               └──────────────────────────┤
                   └──────────────────────────────────────────┤
                                                              ▼
                                                        5. Evolve ──▶ done
```

---

## Phase 0 — Scope

Before touching anything technical, write a one-paragraph **scope statement**:

1. What system is this? (the actual system, not the goal.)
2. What is the authorization basis? (own system / written permission /
   sanctioned exercise / public scope.)
3. What is in scope and explicitly what is out of scope?
4. What are the handoff points where a human must act or approve?

Why: every later judgment — "should I automate this step?", "should I push
through this friction?" — is a scope question wearing a technical costume.
With the scope written, those judgments take seconds.

**Traps.** Assuming permission from availability. Letting scope drift as you
discover interesting side systems. Treating "it worked" as authorization.

**Exit gate.** The scope statement exists in a file, dated.

---

## Phase 1 — Perceive

### 1.1 Truth hierarchy

Rank every source and never let a lower rank overrule a higher one:

| Rank | Source | Trust notes |
|---|---|---|
| 1 | Live observed behavior (captures, responses) | Reproduce before use |
| 2 | The system's own client / SDK / CLI | A convenience layer; may lag |
| 3 | Official documentation | Frequently stale; treat as hypothesis |
| 4 | Memory, intuition, "how systems usually work" | Hypothesis only |

Tag each fact `[OBS]`, `[REP]`, or `[INF]` with a date. Re-verify any `[REP]`
or `[INF]` fact before it influences a decision.

### 1.2 Surface taxonomy

Enumerate the surfaces before concluding anything:

- Static content, rendered clients, background traffic, native applications,
  command-line tools, embedded third-party frames.

"A page fetch showed nothing" is not "there is nothing" — client-rendered
surfaces hide their logic in bundles and frames. For each surface record: where
its logic lives, how you observe it, and whether it matters for this job.

### 1.3 Protection classification

Classify each surface's protection posture before automating:

- **None** — no friction observed.
- **SILENT** — limits and checks that act quietly (throttles, caps, quirks).
- **INTERACTIVE** — a step that explicitly requires a human.

Policy: automate the quiet classes with respect; route interactive steps to a
human as a designed part of the workflow. Never engineer around an interactive
wall — that is out of scope for this method, and it is where authorized work
becomes unauthorized.

### 1.4 Capture the exchanges

For every operation you need, capture complete exchanges: request, response,
timing, ordering, identifiers, headers that matter. Prefer the system's own
client as the capture vehicle — it knows the current contract.

Write a **zero-think decision table** as you go: situation → exact action →
exact command. Once a branch point is settled by evidence, it should never be
re-litigated mid-run.

### 1.5 Error census

Deliberately probe the error space: malformed input, missing fields, expired
credentials, wrong identifiers, oversized bodies. Record how each failure
presents. Expect at least one of:

- success-looking transport with failure inside the payload;
- empty results that look like success;
- silent truncation;
- delayed delivery (the failure arrives later, asynchronously).

Each observed error class becomes a row: symptom → meaning → programmed
reaction. Branch on payloads, not just transport status.

**Exit gate.** A facts table where every load-bearing claim is `[OBS]` with an
artifact attached; protection classes recorded per surface.

---

## Phase 2 — Model

### 2.1 Contract from captures

Write the minimal request/response contract that explains the captures:
required fields, optional fields, encodings, ordering, identifiers. Then prove
it: replay a minimal reproduction from a clean state. A contract that has never
been replayed is a story.

### 2.2 Flow state machine

For multi-step flows, derive states from observations, not imagination:

- states and the guards that move between them;
- the artifact produced at each step (id, token, resource);
- resumption fields (what the next step needs, and where it comes from);
- expiry windows and renewal mechanics;
- which states can be re-entered safely (resume points).

Map each state to a persisted field and a log line: the diagram must survive a
process restart.

### 2.3 Limits and leases

- Vary one axis at a time (identity, key, project, address, concurrency) and
  observe which one moves the limit. Read limit headers and error bodies;
  note reset windows.
- Distinguish documented limits from actual limits, and explicit rejection
  from silent death. Bisect boundaries between known-good and known-failing.
- For anything with a lifetime (sessions, sandboxes, leases), find the lease
  object, its TTL, renewal mechanism, and what rehydrates after a restart.

### 2.4 Route variants

The same capability often exists on several routes (streaming vs not, tier A vs
tier B, dialect A vs dialect B). Map: latency, throughput, error profile,
feature support. Defaults and fallbacks are a written policy, not an accident.

**Exit gate.** The model predicts the next observation before you make it. When
a prediction fails, treat the model as wrong and update it — never explain the
anomaly away.

**Traps.** Modeling flows from memory of similar systems. Assuming per-unit
limits are per-identity. Assuming a sentinel ends every stream (some streams
end by simply closing).

---

## Phase 3 — Execute

### 3.1 Minimal harness first

One path, end to end, from a clean start. No abstraction until it works once;
no generalization until it works twice.

### 3.2 Failure taxonomy before retry logic

Classify, then act — one behavior per class:

| Class | Meaning | Reaction |
|---|---|---|
| Contention | a unit is busy | switch unit immediately, no penalty |
| Shared throttle | a common gate engaged | global backoff with jitter |
| Hard limit | a real ceiling | stop; do not hammer |
| Auth failure | credential dead or stale | refresh once and retry; disable the unit if it still fails |
| Outage | platform degraded | pause the lane; keep one canary |
| Silent failure | success-shaped failure | treat as failure; re-probe |

A blanket retry policy is a way to hide all six classes behind one symptom.

### 3.3 Replay safety

- Fresh nonces / one-time parameters per attempt.
- Idempotency keys where the system supports them; seen-sets where it does not.
- Consumed artifacts marked by rename, never deletion.
- Prove it: run the double-execution test and confirm no duplicates.

### 3.4 Gates that actually gate

Every cap, semaphore, and limit is verified empirically — typically by a
concurrency sweep that must plateau at the cap. A gate that has never been
swept is a comment. Watch for the classic defect: a condition that starts
already satisfied, making the gate silently always-true.

### 3.5 Capacity and backpressure

- Discover soft ceilings with a sweep; respect them additively (grow slowly,
  halve on contention), never race a pool-bound system.
- Bound every queue; define the overflow policy (rejecting the newest is
  usually kinder than stranding the oldest).
- Per-unit in-flight limits: parallelism comes from distinct units, not from
  parallel calls on one unit upstream treats as single-flight.

### 3.6 Credential path

Design it before you need it: which credential class, where it lives, how it
refreshes, what happens when it dies, how it is stored, how it is kept out of
logs. (The `credential-hygiene` skill is the full playbook.)

### 3.7 Long-run shape

If the work will outlive a single process: state files with atomic writes, an
append-only ledger, a supervisor with guards (liveness, staleness, progress,
budget), and a resume protocol. (The `durable-goals` skill is the full
playbook.)

**Exit gate.** Works twice in a row from a clean start; second run proves no
duplicate side effects; every gate has sweep evidence.

---

## Phase 4 — Verify

### 4.1 The gate function

Before any claim: (1) identify the command that would prove it; (2) run it
fresh; (3) read the entire output; (4) count failures; (5) decide if the output
actually confirms the claim; (6) only then state the claim, with the evidence.
Skipping any step is not verifying.

### 4.2 Airtight probes

Define terminal success for the whole chain. Build the smallest probe that
reaches it. A probe that only proves an intermediate signal proves almost
nothing — a message sent is not a message received, a link issued is not a
link used.

### 4.3 Negative verification

To prove something is *not* happening: capture a before state with a freshness
discriminator, trigger the behavior, capture the after state, and repeat across
several triggers. One observation of absence proves nothing.

### 4.4 Falsification

Watch every new check fail for the right reason before trusting it when it
passes. A test that has never failed may test nothing.

### 4.5 End-to-end, then stress

Verify through the same surface the user will use, with a captured artifact.
Then stress: full concurrency, long sessions, the ugly inputs — and check
health after the stress, not only during it.

**Exit gate.** Every completion criterion has a command + observed output in
the evidence log. Unverified items are labeled, not hidden.

---

## Phase 5 — Evolve

### 5.1 Memory triad

Beside the work (or the skill), keep three files:

1. **lessons** — symptom → root cause → fix → how verified; deduped by symptom;
   recurrence increments a counter and a date instead of adding noise.
2. **state** — current verified facts (endpoints, shapes, limits, versions)
   with dates.
3. **run log** — append-only, redacted, one line per run with receipts.

### 5.2 Consult before, append after

Read the lessons before starting. Confirm none of the recorded failure modes
applies. At the end, append what changed. A lesson written but never read is
decoration.

### 5.3 Drift watch

External surfaces change: shapes, versions, limits. When observation
contradicts the written state, the state is wrong — fix it immediately, date
the correction, and record the drift as a lesson.

### 5.4 Guarded adaptation

Adapt thresholds only with repeated evidence: multiple consistent
observations, small deltas, a never-change list for safety parameters. One
noisy run moves nothing.

**Exit gate.** A fresh session, with zero context, can read the memory and
continue the work correctly.

---

## Stop conditions

Know when to stop, and why:

- **Done** — every completion criterion verified with artifacts.
- **Blocked** — three distinct attempts failed; write the blocker with evidence
  and a precise resume path; move on.
- **Out of scope** — the path requires crossing a boundary (an interactive
  wall, an unclear authorization, a system showing defensive posture). Stop,
  document, hand back.
- **Budget** — time, actions, or spend exhausted; checkpoint everything and
  produce a handoff.

"Keep trying" is not a stop condition. It is a way to lose the ability to
report honestly.
