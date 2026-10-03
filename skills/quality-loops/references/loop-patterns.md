# Loop Patterns

Companion to `quality-loops/SKILL.md`. Read this when designing a loop, a
rubric, a review gate, or an eval suite, and when a loop is grinding instead of
converging.

---

## 1. Loop anatomy

Every quality loop has five parts:

```
produce -> measure against a written bar -> keep or revise -> repeat
                                                     |
                              stop on: target | plateau | budget | pass
```

- **Produce**: one worker, one context, the best attempt it can make.
- **Measure**: a separate judge against a frozen rubric. The rubric is the
  highest-leverage input — a vague rubric produces vague feedback and
  expensive iterations.
- **Keep or revise**: keep moves the snapshot forward; revise issues at most
  one focused change and re-measures with the same instrument.
- **Stop**: exactly one of target reached, plateau detected, budget exhausted,
  or pass. Record which.

The loop reports its trajectory, not just its output: iteration count, scores
per round, what was kept, what was reverted, and why it stopped.

---

## 2. Rubric worksheet

Answer these questions before writing criteria:

1. What artifact is being judged, exactly (file, report, behavior)?
2. What does "acceptable" mean in observable terms?
3. Which criteria are independent of each other?
4. For each criterion, what would a FAIL look like concretely?
5. Who judges, and are they a separate context from the producer?
6. Where is the verdict recorded?

Rubric rules:

- Objectively checkable statements, not adjectives.
- One concern per criterion, so feedback points at one fix.
- PASS requires every criterion; no blended scores that hide a failed
  criterion.
- Frozen for the loop's life. Improvements to the rubric start a new loop.
- A criterion nobody can check is an open question for the human, not a
  criterion.

Example rubric skeleton for a written deliverable (adapt the criteria to the
domain; the shape is the lesson):

```
C1. Covers the required sections listed in the brief.
C2. Every claim traceable to a cited source or a labeled inference.
C3. Contains a reproduction or usage path that runs without edits.
C4. No placeholder text, no unfinished stubs.
C5. Length within the stated range.
```

Each FAIL names the criterion and the specific location, so the next iteration
has one clear target.

---

## 3. Judge verdict format

Structured verdicts make routing mechanical:

```
verdict: PASS | FAIL | BLOCKED
criteria:
  C1: PASS
  C2: FAIL - <specific location and what is missing>
  C3: PASS
feedback: <one paragraph, addressed to the producer; only what to change>
```

Guidelines:

- A judge never rewrites the artifact — that would cross the author/judge
  boundary. It points; the producer fixes.
- Feedback is actionable and scoped; "improve everything" is a loop diffuser.
- The judge does not re-run the producer's reasoning; it inspects the artifact
  against the rubric.
- Verdicts are recorded with a timestamp so the trajectory can be rebuilt.

---

## 4. Fix-loop ladder

When a review wave produces findings, climb this ladder from cheapest to most
expensive, and stop as soon as the finding is resolved:

1. **Original author resumes** — they hold the context; this is usually the
   fastest correct fix.
2. **Fresh implementer, standard tier** — when the author is stuck or biased.
3. **Fresh implementer, stronger tier** — when repeated attempts fail; pair
   the escalation with a sharper prompt, not just more capability.
4. **Adjudication** — at the cap, park each finding with a written ruling, or
   stop the line when the finding is load-bearing for later work.

One fix dispatch per review wave, not one per finding. After each round, a
scoped re-review of only the fix diff. Silent discards are forbidden; every
ruling is in the record.

---

## 5. Plateau and best-variant machinery

Track per iteration: the measured score, whether it improved, and the snapshot
identity. The bookkeeping:

- Reset the patience counter on any keep.
- Increment patience on anything else: failed gates, below-threshold gains,
  and reverts all count.
- At the patience bound or iteration cap, stop and restore the best snapshot —
  not the last.
- Report the full trajectory: best score, iteration it occurred, termination
  cause.

A loop that never improves past its first attempt is telling you the approach
is wrong; a loop that oscillates is telling you the rubric is ambiguous or the
changes are bundled. Both are fixed by changing the loop, not by extending its
budget.

---

## 6. De-sloppify checklist

Run in a fresh context, after the main work, with the suite as the guard:

- [ ] Remove tests that verify framework or language behavior rather than
      business logic.
- [ ] Remove redundant type checks and validations for impossible states.
- [ ] Remove commented-out code and dead branches left from earlier rounds.
- [ ] Remove debugging output that is not an intentional feature.
- [ ] Keep every business-logic test, including edge cases.
- [ ] Re-run the full suite after cleanup; a cleanup that changes behavior is
      reverted.

The pass removes noise, not coverage. If cleanup would remove a test you
cannot classify, leave it and flag it for review instead of guessing.

---

## 7. Pipeline depth by tier

| Tier | Typical work | Pipeline depth |
|---|---|---|
| Trivial | One-line or mechanical change | Implement + test |
| Small | One bounded component | Implement + test + review |
| Medium | Multiple components, some risk | Research, spec, implement, quality review, fix loop |
| Large | Cross-cutting or architectural | Full pipeline including plan critique and final review |

Depth follows blast radius. Escalate a tier when a change touches shared
interfaces, security-relevant paths, or anything other work will build on.

---

## 8. Graph specification sketch

A state graph is: nodes (tasks and judges), conditional edges, and caps.

```
graph
  nodes:
    work-a:   task
    work-b:   task
    judge-1:  judge        # emits a routing verdict
    fix-a:    task         # bounded by max visits
  edges:
    work-a  -> judge-1     (always)
    work-b  -> judge-1     (always)
    judge-1 -> fix-a       (verdict token routes here)
    judge-1 -> end         (verdict token routes here)
  caps:
    max_iterations:        global budget
    max_visits per node:   cycle bound
```

Routing rules:

- Judges emit an exact token, e.g. `NEXT:<node-id>` or `STOP`, and the
  orchestrator routes on the prefixed token only.
- Every cycle needs both caps: per-node visits and a global iteration budget.
- Errored nodes fail closed; nothing downstream activates.
- Each super-step runs active nodes in parallel, then activates the next wave
  from satisfied edges.
- Synthesis nodes read the actual upstream outputs; a synthesis from memory of
  instructions is not a synthesis.

---

## 9. Eval matrix

| Eval type | Purpose | Instrument order |
|---|---|---|
| Capability | Prove new behavior exists | Code check, then schema check, then rubric judge |
| Regression | Prove old behavior still holds | Code check, then schema check |
| Release-critical | Must hold on every attempt | pass-to-the-k, human adjudication for ambiguous cases |

Notes:

- Grade with the strongest instrument available: deterministic checks beat
  rubric judgments, which beat prose impressions.
- Track both pass-at-k and pass-to-the-k; the second is the release bar for
  paths where a single failure is unacceptable.
- Version evals with the code; store baseline snapshots so a regression is a
  diff, not a memory.
- Keep a held-out set of cases to detect overfitting to the visible examples.
- Evals are unit tests of behavior, not of style; style belongs in review.

---

## 10. Landing queue procedure

1. Rebase the change onto the current target.
2. Run the full suite on the integrated result — not on the isolated branch.
3. If green, land. If red, evict.
4. On eviction, capture the full context: conflicting files, diffs, test
   output, the failing check.
5. Feed that context to the producer with the next attempt; a blind re-run is
   forbidden.
6. Land non-overlapping units concurrently; serialize overlapping ones.

Properties the queue protects: mainline passes the suite at every landing
point, reviews stay small because changes are stacked per task, and conflicts
arrive with enough context to be fixed rather than re-rolled.

---

## 11. Loop setup checklist

- [ ] Deliverable and bar defined in one sentence each.
- [ ] Rubric written, checkable, frozen; judge is a separate context.
- [ ] Write scopes assigned; measurement owner differs from measured owner.
- [ ] Iteration cap and patience bound chosen (small defaults, tuned later).
- [ ] Snapshot/restore mechanism tested before the first iteration.
- [ ] Fix-loop ladder and adjudication rule written down.
- [ ] Termination causes named; the report format includes the trajectory.
- [ ] Eval hooks in place for anything that must not regress.
