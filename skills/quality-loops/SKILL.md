---
name: quality-loops
description: >-
  Drive iterative work to a checkable bar with independent judgment and hard
  stop conditions. Use when a deliverable must improve over rounds, when a
  judge grades against a rubric, when a build-test-fix cycle needs routing and
  caps, or when agent behavior changes need evals. Covers evaluator-optimizer
  loops, rubrics, judge separation, write scopes, fix loops, plateau handling,
  de-sloppify passes, review gates, graph routing, and evals. Not for
  one-shot tasks, durable scheduling (`durable-goals`), or fanout
  (`swarm-orchestration`).
license: MIT
metadata:
  version: 1.0.0
---

# Quality Loops

A quality loop is verification-gated repetition: produce, measure against a
written bar, keep or revise, repeat until the bar is met or the budget ends.
One-shot generation rarely meets a bar; unbounded revision never terminates.
This skill makes the middle ground predictable and the loop's ending
reportable.

## Decision table

| Situation | Action | Load |
|---|---|---|
| A deliverable must improve over rounds | Run an evaluator-optimizer loop with a budget | Method 1 |
| Writing the acceptance criteria | Make every criterion objectively checkable | Method 2 |
| Choosing who judges | A separate context; read-only where possible | Method 3 |
| The producer could weaken its own test | Disjoint write scopes: source versus tests | Method 4 |
| Implementing a multi-task build | Plan, critique the plan, then execute task by task | Method 5 |
| The loop is not converging | Plateau detection; restore the best variant | Method 6 |
| Tempted to bundle edits | One change per iteration; one task at a time | Method 7 |
| Review findings keep coming back | Bound the fix loop; end with adjudication | Method 10 |
| Work has dependencies and cycles | Graph execution with visit caps and fail-closed errors | Method 11 |
| Agent behavior must not regress | Keep evals as unit tests of behavior | Method 12 |
| Several changes are ready to land | Land through a queue; never blindly re-run | Method 13 |

## Golden rules

1. **Every loop has a budget and a stop condition.** Without one, "improve"
   never terminates; with one, the ending is reportable.
2. **A rubric is checkable or it is vibes.** Checkable criteria let two
   independent judges agree and point feedback at exactly what to fix.
3. **No artifact is approved by its author.** Author bias is the most common
   source of missed defects; judges are separate, read-only contexts.
4. **The measured artifact and the measurement have different owners.**
   Disjoint write scopes keep the gate ungameable; tests are strengthen-only.
5. **One change per iteration.** Bundled changes make deltas unattributable
   and failures hard to localize.
6. **Keep the best variant, not the last.** A loop ends by restoring the
   best-scoring result and reporting the trajectory.
7. **Findings are fixed or parked with a ruling — never silently discarded.**
   Silent discards turn review into theater.
8. **Errored work fails closed.** A dead or failed node never activates
   downstream work, and routing is driven by explicit verdict tokens.

## The method

### 1. Run the evaluator-optimizer loop

A producer generates; a judge grades against a written rubric; on failure the
producer is re-prompted with the judge's feedback while keeping its own
context; on pass the result ships. Retained context lets each iteration build
on the last instead of restarting from zero. Always set an iteration budget.
Keep the verdict history — reporting only the best-looking output without the
trail hides both the work and the risk. When a fresh attempt is cheaper than
another revision, restart instead of revising.

### 2. Design checkable rubrics

Write each criterion as an objectively checkable statement ("covers the three
failure modes") rather than an adjective ("thorough"). Separate concerns per
criterion so feedback points at exactly what to fix. PASS means every
criterion is met; any miss is a FAIL with the failed criterion named. Freeze
the rubric for the life of the loop — a judge that invents criteria mid-loop
makes verdicts incomparable, and two independent judges agreeing is the
readiness test. A template and a worked example are in
`references/loop-patterns.md`.

### 3. Separate author from judge

Every judgment, review, and final gate uses a different agent from the one
that produced the artifact, ideally in a read-only role that lacks edit
ability. Reviewer and producer are separate contexts. A judge prompt never
pre-judges findings and never shows the author's self-assessment. Judges
return structured verdicts; the orchestrator routes on them. Cut elsewhere
first; self-review is where saving a dispatch costs the most.

### 4. Keep write scopes disjoint

Assign scopes by role: the producer owns source, the critic owns tests.
Crossing scopes is a hard gate failure. Tests are strengthen-only: never
weaken, skip, or delete a passing test to get a change through. The same rule
protects every measurement instrument — the eval, the benchmark, the schema —
from edits by the party being measured. Editing the oracle is the cheapest way
to fake progress and the first thing to check when results look too good.

### 5. Plan, then critique the plan

Decompose the work into review-sized tasks, each tied to exact files with a
verification step and dependencies; order them topologically and record
genuine unknowns as open questions for the human, never silent placeholders.
Before executing, run one adversarial plan critique: alignment with the
objective, decomposition, testability, executability. Revise until it passes.
A task with no verification step is not ready to execute. Deep delivery
planning belongs to your project process; this skill keeps only the gate.

### 6. Bound iterations, detect plateaus, restore the best

Set a hard iteration cap and a patience counter: stop after a small number of
consecutive non-improving iterations — a handful is a common default — and
reset the counter on any keep. Count failed gates and below-threshold gains as
non-improving; counting only hard errors lets a loop grind a dead end. On
stop, restore the best-scoring variant and report the trajectory, the
termination cause, and the iteration count. Restoring the last variant because
it was last is how loops ship regressions.

### 7. One change per iteration; one task at a time

In optimization loops, apply exactly one focused change and re-measure with
the same method before considering another. In task loops, execute one task at
a time in dependency order and never build on a task that was not kept. Every
kept delta then has a single cause, and every later task's ancestry contains
only kept work. "While I'm here" edits are how unexplained regressions enter a
branch.

### 8. Run a de-sloppify pass

Do not constrain a thorough producer with negative instructions; they degrade
unrelated behavior. Instead, add a separate cleanup pass in a fresh context
after the main work: remove tests that verify framework behavior rather than
business logic, redundant type checks, guards for impossible states, and
commented-out code. Keep every business-logic test and re-run the suite after
cleanup. The pass removes noise, not coverage, and the re-run is what proves
it.

### 9. Tier pipeline depth by risk

Classify work units by blast radius and assign depth: trivial work gets
implementation plus tests; small work adds review; medium work adds research,
a written spec, quality review, and a fix loop; large work runs the full
pipeline including final review. Depth is driven by risk, not by schedule.
Full ceremony for a one-line fix wastes budget; implement-and-test only for a
cross-cutting change is how risk ships.

### 10. Gate reviews; bound fix loops; end with adjudication

Gate each task on a review that reports specification compliance and quality.
The review discipline — one fix dispatch per wave, the original author first,
scoped re-review of the fix delta, round caps and the breaker, written rulings
for parked findings — is owned by `adversarial-review`. The loop rule here:
a loop does not terminate while a finding is neither fixed nor parked with a
recorded ruling. Silent discards are forbidden.

### 11. Execute as a graph with routing and caps

Model multi-stage work as a state graph: task nodes produce, judge nodes
decide routing via explicit verdict tokens, edges are conditional, and each
super-step runs its active nodes in parallel before satisfied edges activate
the next wave. Instruct judges to emit an exact routing token — a declared
token followed by the target node name — and route on the token, never on a
bare keyword that can false-positive in prose. Cap every cycle with per-node
visit limits plus a global iteration budget. Errored nodes fail closed: they
never activate downstream work. Prefer wider graphs with a synthesis node over
deep chains, because failures compound along a chain.

### 12. Land through evals and a queue

Behavior changes are unit-tested like code: define capability and regression
evals before changing prompts, skills, or agents, and land each change only
after the integrated result passes the full suite. The eval matrix
(instruments, `pass@k`/`pass^k`, holdouts) and the landing-queue procedure
live in `references/loop-patterns.md`.

**Exit gate.** Every loop's termination cause is reported; no artifact was
approved by its author; every measurement was owned by someone other than the
measured party; findings are fixed or parked with a recorded ruling; evals
exist for every behavior change; the integrated result passed the full suite
before landing.

## When NOT to use

- The first attempt already meets a checkable bar — verify it and ship.
- The work is fanout of independent one-shot tasks — use
  `swarm-orchestration`; loops are for iterated artifacts.
- The challenge is duration, budgets, or restarts — use `durable-goals`.
- The output has no measurable or checkable bar — define one first, or route
  to human review; a loop without a bar cannot terminate honestly.

## References

- `references/loop-patterns.md` — rubric worksheet, verdict and routing
  formats, graph specification sketch, fix-loop ladder, eval matrix, and the
  landing queue procedure. Read it when designing a loop or a review gate.
- `adversarial-review` — the review discipline this loop's gates delegate to.
- `evidence-protocol` — how verdicts and checks become recorded evidence.
- `self-evolving-skills` — keeping loop lessons between runs.
- `durable-goals` — long-run state when loops span sessions.
